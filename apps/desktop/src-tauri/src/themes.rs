//! Custom themes for the main window (UI design note, section 11).
//!
//! A custom theme is a CSS file in the `themes` folder of the app's config
//! directory (on Windows `%APPDATA%\dev.nailongmeow.nl\themes`). The page
//! applies the one the user picks on top of the built-in theme; this module
//! only finds the files, reads them, and opens the folder.
//!
//! The files are untrusted input (T6). A file larger than `MAX_THEME_BYTES`
//! or not in UTF-8 is listed with the reason it was refused and without its
//! text, so it is never applied in part. What a theme can do once applied is
//! limited by the page's content-security policy, which keeps it from loading
//! anything from the network.

use std::io;
use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::Manager;

/// The largest theme file that is read: far more than a set of `--nl-*`
/// properties needs, small enough that a stray file cannot slow the window.
pub const MAX_THEME_BYTES: u64 = 256 * 1024;

/// One file in the themes folder.
#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CustomTheme {
    /// The file name, such as `ocean.css`. The page stores it as the choice.
    pub file: String,
    /// The name to show: the file name without `.css`.
    pub name: String,
    /// The CSS text; absent when the file was refused.
    pub css: Option<String>,
    /// Why the file was refused, for the page to show; absent when it was read.
    pub problem: Option<Problem>,
}

/// Why a theme file was refused.
#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum Problem {
    TooLarge,
    NotUtf8,
    Unreadable,
}

/// What the page needs to list the custom themes.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomThemes {
    /// The folder, shown so that the user knows where to put files.
    pub folder: String,
    /// The theme files, sorted by file name.
    pub themes: Vec<CustomTheme>,
}

/// Lists the `.css` files directly inside `dir`, sorted by file name. A
/// missing folder has no themes; other folders and files are ignored.
pub fn list(dir: &Path) -> io::Result<Vec<CustomTheme>> {
    let entries = match std::fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(error) => return Err(error),
    };
    let mut themes = Vec::new();
    for entry in entries {
        let entry = entry?;
        let Ok(file) = entry.file_name().into_string() else {
            continue;
        };
        let Some(name) = css_stem(&file) else {
            continue;
        };
        let Ok(metadata) = entry.metadata() else {
            continue;
        };
        if !metadata.is_file() {
            continue;
        }
        let (css, problem) = if metadata.len() > MAX_THEME_BYTES {
            (None, Some(Problem::TooLarge))
        } else {
            match std::fs::read(entry.path()) {
                Ok(bytes) => match String::from_utf8(bytes) {
                    Ok(text) => (Some(text), None),
                    Err(_) => (None, Some(Problem::NotUtf8)),
                },
                Err(_) => (None, Some(Problem::Unreadable)),
            }
        };
        themes.push(CustomTheme {
            name: name.to_owned(),
            file,
            css,
            problem,
        });
    }
    themes.sort_by(|a, b| a.file.cmp(&b.file));
    Ok(themes)
}

/// The file name without a `.css` extension (any case), or None for other files.
fn css_stem(file: &str) -> Option<&str> {
    let dot = file.rfind('.')?;
    let (stem, extension) = (&file[..dot], &file[dot + 1..]);
    (extension.eq_ignore_ascii_case("css") && !stem.is_empty()).then_some(stem)
}

/// The themes folder, created on first use so that the user can open it.
fn folder(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?
        .join("themes");
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir)
}

/// Lists the custom themes and says where they live.
#[tauri::command]
pub fn custom_themes(app: tauri::AppHandle) -> Result<CustomThemes, String> {
    let dir = folder(&app)?;
    let themes = list(&dir).map_err(|error| error.to_string())?;
    Ok(CustomThemes {
        folder: dir.to_string_lossy().into_owned(),
        themes,
    })
}

/// Opens the themes folder in the system's file manager. The path is the
/// app's own folder, never one the page passes in.
#[tauri::command]
pub fn open_custom_themes_folder(app: tauri::AppHandle) -> Result<(), String> {
    crate::folders::open(&folder(&app)?)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A fresh, empty folder under the system's temp directory, removed on drop.
    struct TempFolder(PathBuf);

    impl TempFolder {
        fn new(name: &str) -> Self {
            let path = std::env::temp_dir()
                .join(format!("nl-desktop-themes-{}-{name}", std::process::id()));
            let _ = std::fs::remove_dir_all(&path);
            std::fs::create_dir_all(&path).unwrap();
            Self(path)
        }
    }

    impl Drop for TempFolder {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn lists_css_files_by_name_with_their_text() {
        let folder = TempFolder::new("list");
        std::fs::write(
            folder.0.join("ocean.css"),
            ":root { --nl-color-accent-fill: #0077c2; }",
        )
        .unwrap();
        std::fs::write(folder.0.join("Autumn.CSS"), ":root {}").unwrap();
        std::fs::write(folder.0.join("notes.txt"), "not a theme").unwrap();
        std::fs::write(folder.0.join(".css"), "no name").unwrap();
        std::fs::create_dir(folder.0.join("folder.css")).unwrap();

        let themes = list(&folder.0).unwrap();
        assert_eq!(
            themes,
            vec![
                CustomTheme {
                    file: "Autumn.CSS".into(),
                    name: "Autumn".into(),
                    css: Some(":root {}".into()),
                    problem: None
                },
                CustomTheme {
                    file: "ocean.css".into(),
                    name: "ocean".into(),
                    css: Some(":root { --nl-color-accent-fill: #0077c2; }".into()),
                    problem: None,
                },
            ]
        );
    }

    #[test]
    fn refuses_large_and_non_utf8_files_without_reading_them_in_part() {
        let folder = TempFolder::new("refuse");
        std::fs::write(
            folder.0.join("big.css"),
            vec![b' '; MAX_THEME_BYTES as usize + 1],
        )
        .unwrap();
        std::fs::write(
            folder.0.join("edge.css"),
            vec![b' '; MAX_THEME_BYTES as usize],
        )
        .unwrap();
        std::fs::write(
            folder.0.join("latin1.css"),
            [0x3a, 0x72, 0x6f, 0x6f, 0x74, 0xe9],
        )
        .unwrap();

        let themes = list(&folder.0).unwrap();
        let summary: Vec<_> = themes
            .iter()
            .map(|theme| {
                (
                    theme.file.as_str(),
                    theme.css.is_some(),
                    theme.problem.as_ref(),
                )
            })
            .collect();
        assert_eq!(
            summary,
            vec![
                ("big.css", false, Some(&Problem::TooLarge)),
                ("edge.css", true, None),
                ("latin1.css", false, Some(&Problem::NotUtf8)),
            ]
        );
    }

    #[test]
    fn a_missing_folder_has_no_themes() {
        let folder = TempFolder::new("missing");
        assert_eq!(list(&folder.0.join("absent")).unwrap(), Vec::new());
    }

    #[test]
    fn serializes_for_the_page_in_camel_and_kebab_case() {
        let theme = CustomTheme {
            file: "big.css".into(),
            name: "big".into(),
            css: None,
            problem: Some(Problem::TooLarge),
        };
        assert_eq!(
            serde_json::to_value(&theme).unwrap(),
            serde_json::json!({ "file": "big.css", "name": "big", "css": null, "problem": "too-large" })
        );
    }
}
