//! Avatars the user installs (UI design note, sections 6 and 10).
//!
//! An avatar pack is a folder with an `avatar.json` and the art it names, in
//! the format published with the `nl-avatar` agent skill
//! (skills/nl-avatar/references/format.md). Packs live in the `avatars`
//! folder of the app's local data folder (on Windows
//! `%LOCALAPPDATA%\dev.nailongmeow.nl\avatars`), one folder per pack, named
//! after its id. The user, or an agent running the skill's `install`
//! command, puts them there. This module lists them for the page, opens the
//! folder, and serves their files to the windows through the `nlavatar` URI
//! scheme. The page checks each manifest with the skill's own rules.
//!
//! Packs are untrusted input (T8): only files the shared rules allow are
//! listed or served (`nl_assets::is_allowed_file`), links are never
//! followed out of a pack, and nothing in a pack is ever run. The Live2D
//! runtime, which is code, is served only when it is one this build accepts
//! (see [`runtime`]).
//!
//! Development builds also read two environment variables, for testing with
//! art that must stay out of the repository and the store:
//! `NL_DEV_AVATARS`, a list of pack folders (separated like `PATH`), and
//! `NL_DEV_LIVE2D_RUNTIME`, the folder of a Live2D runtime.

use std::io;
use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::Manager;
use tauri::http::{Request, Response, StatusCode, header};

/// The URI scheme the windows load avatar files from: on Windows
/// `http://nlavatar.localhost/…`, elsewhere `nlavatar://localhost/…`.
pub const SCHEME: &str = "nlavatar";

/// Digests (`nl_assets::runtime_digest`, hex) of the Live2D runtimes this
/// build accepts. Empty: NL has no runtime of its own yet, and Live2D's terms
/// for apps that load any model ("Expandable Applications") are not settled,
/// so release builds show no Live2D until a runtime is pinned here.
const ACCEPTED_RUNTIMES: &[&str] = &[];

/// One pack in the avatars folder (or a development folder).
#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AvatarEntry {
    /// What the windows name the pack by in `nlavatar` URLs: its folder
    /// name, which must equal the manifest's id; for a development folder,
    /// the manifest's id.
    pub key: String,
    /// The text of `avatar.json`, for the page to check; absent with a problem.
    pub manifest: Option<String>,
    /// The files the pack may use, relative to its folder, sorted.
    pub files: Vec<String>,
    /// Files left out: not allowed, links, or names that are not Unicode.
    pub skipped: Vec<String>,
    pub problem: Option<Problem>,
    /// Whether it comes from `NL_DEV_AVATARS` rather than the avatars folder.
    pub development: bool,
}

/// Why a pack cannot be used, before its manifest is even read.
#[derive(Debug, Serialize, PartialEq, Eq, Clone, Copy)]
#[serde(rename_all = "kebab-case")]
pub enum Problem {
    NoManifest,
    ManifestTooLarge,
    NotUtf8,
    TooLarge,
    TooManyFiles,
    Unreadable,
}

/// Whether this build can show Live2D avatars, and why not.
#[derive(Debug, Serialize, PartialEq, Eq, Clone, Copy)]
#[serde(rename_all = "kebab-case")]
pub enum Live2D {
    /// A runtime this build accepts is installed.
    Ready,
    /// A development build with `NL_DEV_LIVE2D_RUNTIME` set.
    Development,
    /// No runtime is installed.
    NoRuntime,
    /// A runtime is installed, but not one this build accepts.
    RuntimeRefused,
}

/// What the page needs to list the avatars.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Avatars {
    /// The avatars folder, shown so that the user knows where packs go.
    pub folder: String,
    pub avatars: Vec<AvatarEntry>,
    pub live2d: Live2D,
}

/// Reads one pack folder. `key` is its folder name, or None to take the
/// manifest's id (development folders, whose names mean nothing).
pub fn read_pack(dir: &Path, key: Option<&str>, development: bool) -> Option<AvatarEntry> {
    let rules = nl_assets::rules();
    let mut entry = AvatarEntry {
        key: key.unwrap_or_default().to_owned(),
        manifest: None,
        files: Vec::new(),
        skipped: Vec::new(),
        problem: None,
        development,
    };
    let scan = match nl_assets::scan_dir(dir, nl_assets::is_allowed_file, rules.max_files) {
        Ok(scan) => scan,
        Err(_) => {
            entry.problem = Some(Problem::Unreadable);
            return key.is_some().then_some(entry);
        }
    };
    let total = scan
        .files
        .iter()
        .fold(0u64, |sum, file| sum.saturating_add(file.size));
    entry.skipped = scan.skipped.into_iter().map(|(path, _)| path).collect();
    entry.problem = if scan.truncated || scan.files.len() > rules.max_files {
        Some(Problem::TooManyFiles)
    } else if total > rules.max_total_bytes {
        Some(Problem::TooLarge)
    } else {
        match scan.files.iter().find(|file| file.path == rules.manifest) {
            None => Some(Problem::NoManifest),
            Some(file) if file.size > rules.max_manifest_bytes => Some(Problem::ManifestTooLarge),
            Some(_) => match std::fs::read(dir.join(&rules.manifest)) {
                Ok(bytes) => match String::from_utf8(bytes) {
                    Ok(text) => {
                        entry.manifest = Some(text);
                        None
                    }
                    Err(_) => Some(Problem::NotUtf8),
                },
                Err(_) => Some(Problem::Unreadable),
            },
        }
    };
    entry.files = scan.files.into_iter().map(|file| file.path).collect();
    if key.is_none() {
        // A development folder is known by its manifest's id; without one it cannot be named.
        entry.key = manifest_id(entry.manifest.as_deref()?)?;
    }
    Some(entry)
}

/// The `id` of a manifest's text, when it has one.
fn manifest_id(text: &str) -> Option<String> {
    let value: serde_json::Value =
        serde_json::from_str(text.trim_start_matches('\u{feff}')).ok()?;
    value.get("id")?.as_str().map(str::to_owned)
}

/// Lists the packs in the avatars folder, then the development folders.
/// Folders whose names start with a dot are skipped: the skill's installer
/// stages copies under such names, so a half-copied pack never shows.
pub fn list(store: &Path, development: &[PathBuf]) -> io::Result<Vec<AvatarEntry>> {
    let mut avatars = Vec::new();
    match std::fs::read_dir(store) {
        Ok(entries) => {
            for entry in entries {
                let entry = entry?;
                let Ok(name) = entry.file_name().into_string() else {
                    continue;
                };
                if name.starts_with('.') || !entry.file_type()?.is_dir() {
                    continue;
                }
                if let Some(pack) = read_pack(&entry.path(), Some(&name), false) {
                    avatars.push(pack);
                }
            }
        }
        Err(error) if error.kind() == io::ErrorKind::NotFound => {}
        Err(error) => return Err(error),
    }
    avatars.sort_by(|a, b| a.key.cmp(&b.key));
    for dir in development {
        if let Some(pack) = read_pack(dir, None, true) {
            // A pack in the avatars folder wins over a development folder with the same id.
            if !avatars.iter().any(|other| other.key == pack.key) {
                avatars.push(pack);
            }
        }
    }
    Ok(avatars)
}

/// The development pack folders, from `NL_DEV_AVATARS`; none in release builds.
fn development_folders() -> Vec<PathBuf> {
    if !cfg!(debug_assertions) {
        return Vec::new();
    }
    std::env::var_os("NL_DEV_AVATARS")
        .map(|value| {
            std::env::split_paths(&value)
                .filter(|p| p.is_dir())
                .collect()
        })
        .unwrap_or_default()
}

/// The avatars folder, created on first use so that the user can open it.
fn store(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_local_data_dir()
        .map_err(|error| error.to_string())?
        .join("avatars");
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir)
}

/// Where the Live2D runtime is, and whether this build may run it: the
/// development runtime from `NL_DEV_LIVE2D_RUNTIME` in development builds,
/// otherwise `live2d-runtime` in the app's local data folder when its digest
/// is one this build accepts.
pub fn runtime(app: &tauri::AppHandle) -> (Live2D, Option<PathBuf>) {
    if cfg!(debug_assertions)
        && let Some(dir) = std::env::var_os("NL_DEV_LIVE2D_RUNTIME").map(PathBuf::from)
        && dir.is_dir()
    {
        return (Live2D::Development, Some(dir));
    }
    let Ok(dir) = app
        .path()
        .app_local_data_dir()
        .map(|dir| dir.join("live2d-runtime"))
    else {
        return (Live2D::NoRuntime, None);
    };
    if !dir.is_dir() {
        return (Live2D::NoRuntime, None);
    }
    match nl_assets::hash_runtime_dir(&dir) {
        Ok(files) if !files.is_empty() => {
            let digest = nl_assets::to_hex(&nl_assets::runtime_digest(&files));
            if ACCEPTED_RUNTIMES.contains(&digest.as_str()) {
                (Live2D::Ready, Some(dir))
            } else {
                (Live2D::RuntimeRefused, None)
            }
        }
        _ => (Live2D::NoRuntime, None),
    }
}

/// Lists the avatars, says where they live, and whether Live2D can show.
#[tauri::command]
pub fn avatars(app: tauri::AppHandle) -> Result<Avatars, String> {
    let dir = store(&app)?;
    let avatars = list(&dir, &development_folders()).map_err(|error| error.to_string())?;
    Ok(Avatars {
        folder: dir.to_string_lossy().into_owned(),
        avatars,
        live2d: runtime(&app).0,
    })
}

/// Opens the avatars folder in the system's file manager. The path is the
/// app's own folder, never one the page passes in.
#[tauri::command]
pub fn open_avatars_folder(app: tauri::AppHandle) -> Result<(), String> {
    crate::folders::open(&store(&app)?)
}

// ---------------------------------------------------------------------------
// The `nlavatar` URI scheme.

/// What a request for an `nlavatar` URL asks for.
#[derive(Debug, PartialEq, Eq)]
pub enum Target {
    /// A file of the pack known by `key`.
    Avatar { key: String, path: String },
    /// A file of the Live2D runtime.
    Runtime { path: String },
}

/// Parses an `nlavatar` URL path: `/a/<key>/<file>` for a pack's file,
/// `/runtime/<file>` for the runtime's. Percent-escapes are decoded first,
/// so a path whose slashes arrive escaped (`a%2Fkey%2Ffile`) parses too. The
/// file path must be one the rules allow.
pub fn parse_target(url_path: &str) -> Option<Target> {
    let decoded = percent_decode(url_path.trim_start_matches('/'))?;
    if let Some(rest) = decoded.strip_prefix("a/") {
        let (key, path) = rest.split_once('/')?;
        let key_ok = !key.is_empty()
            && key.len() <= 64
            && key
                .bytes()
                .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-');
        (key_ok && nl_assets::is_allowed_file(path)).then(|| Target::Avatar {
            key: key.to_owned(),
            path: path.to_owned(),
        })
    } else if let Some(path) = decoded.strip_prefix("runtime/") {
        nl_assets::is_runtime_file(path).then(|| Target::Runtime {
            path: path.to_owned(),
        })
    } else {
        None
    }
}

/// Decodes `%XX` escapes into UTF-8 text; None when malformed.
fn percent_decode(text: &str) -> Option<String> {
    let bytes = text.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' {
            let hex = text.get(index + 1..index + 3)?;
            out.push(u8::from_str_radix(hex, 16).ok()?);
            index += 3;
        } else {
            out.push(bytes[index]);
            index += 1;
        }
    }
    String::from_utf8(out).ok()
}

/// The content type for a served file, by extension.
fn content_type(path: &str) -> &'static str {
    match nl_assets::extension(path).as_deref() {
        Some("png") => "image/png",
        Some("jpg" | "jpeg") => "image/jpeg",
        Some("webp") => "image/webp",
        Some("gif") => "image/gif",
        Some("json") => "application/json",
        Some("wav") => "audio/wav",
        Some("mp3") => "audio/mpeg",
        Some("txt" | "md" | "frag" | "vert") => "text/plain; charset=utf-8",
        Some("js") => "text/javascript; charset=utf-8",
        _ => "application/octet-stream",
    }
}

/// Reads `path` inside `root`, refusing anything that resolves outside it
/// (a link pointing elsewhere) and anything that is not a regular file.
pub fn read_inside(root: &Path, path: &str) -> io::Result<Vec<u8>> {
    let root = root.canonicalize()?;
    let file = root.join(path).canonicalize()?;
    if !file.starts_with(&root) || !file.is_file() {
        return Err(io::Error::new(
            io::ErrorKind::PermissionDenied,
            "outside the pack",
        ));
    }
    std::fs::read(file)
}

/// Finds the folder of the pack known by `key`.
fn pack_folder(app: &tauri::AppHandle, key: &str) -> Option<PathBuf> {
    let stored = store(app).ok()?.join(key);
    if stored.is_dir() {
        return Some(stored);
    }
    development_folders()
        .into_iter()
        .find(|dir| read_pack(dir, None, true).is_some_and(|pack| pack.key == key))
}

/// Answers one `nlavatar` request.
pub fn respond(app: &tauri::AppHandle, request: &Request<Vec<u8>>) -> Response<Vec<u8>> {
    let status = |code: StatusCode| {
        Response::builder()
            .status(code)
            .body(Vec::new())
            .expect("a status-only response is valid")
    };
    let Some(target) = parse_target(request.uri().path()) else {
        return status(StatusCode::NOT_FOUND);
    };
    let (root, path) = match target {
        Target::Avatar { key, path } => match pack_folder(app, &key) {
            Some(root) => (root, path),
            None => return status(StatusCode::NOT_FOUND),
        },
        Target::Runtime { path } => match runtime(app) {
            (Live2D::Ready | Live2D::Development, Some(root)) => (root, path),
            _ => return status(StatusCode::FORBIDDEN),
        },
    };
    match read_inside(&root, &path) {
        Ok(bytes) => Response::builder()
            .header(header::CONTENT_TYPE, content_type(&path))
            // The windows load these files from another origin (the app's own
            // pages are on tauri.localhost or the development server), so
            // fetch() and WebGL textures need CORS to read them.
            .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
            .header(header::CACHE_CONTROL, "no-cache")
            .body(bytes)
            .expect("a response with valid headers"),
        Err(_) => status(StatusCode::NOT_FOUND),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A fresh, empty folder under the system's temp directory, removed on drop.
    struct TempFolder(PathBuf);

    impl TempFolder {
        fn new(name: &str) -> Self {
            let path = std::env::temp_dir()
                .join(format!("nl-desktop-avatars-{}-{name}", std::process::id()));
            let _ = std::fs::remove_dir_all(&path);
            std::fs::create_dir_all(&path).unwrap();
            Self(path)
        }

        fn write(&self, path: &str, bytes: &[u8]) {
            let full = self.0.join(path);
            std::fs::create_dir_all(full.parent().unwrap()).unwrap();
            std::fs::write(full, bytes).unwrap();
        }
    }

    impl Drop for TempFolder {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn lists_packs_with_their_manifest_and_files() {
        let store = TempFolder::new("list");
        store.write("mochi/avatar.json", br#"{"nlAvatar":1,"id":"mochi"}"#);
        store.write("mochi/idle.gif", b"GIF89a");
        store.write("mochi/tools/run.js", b"alert(1)");
        store.write("empty/readme.txt", b"no manifest");
        store.write(".mochi.installing-1/avatar.json", b"{}");
        store.write("loose.png", b"not in a folder");

        let avatars = list(&store.0, &[]).unwrap();
        assert_eq!(
            avatars,
            vec![
                AvatarEntry {
                    key: "empty".into(),
                    manifest: None,
                    files: vec!["readme.txt".into()],
                    skipped: vec![],
                    problem: Some(Problem::NoManifest),
                    development: false,
                },
                AvatarEntry {
                    key: "mochi".into(),
                    manifest: Some(r#"{"nlAvatar":1,"id":"mochi"}"#.into()),
                    files: vec!["avatar.json".into(), "idle.gif".into()],
                    skipped: vec!["tools/run.js".into()],
                    problem: None,
                    development: false,
                },
            ]
        );
    }

    #[test]
    fn a_missing_folder_has_no_avatars() {
        let store = TempFolder::new("missing");
        assert_eq!(list(&store.0.join("absent"), &[]).unwrap(), Vec::new());
    }

    #[test]
    fn development_folders_are_known_by_their_manifest_id() {
        let store = TempFolder::new("dev-store");
        store.write("mochi/avatar.json", br#"{"id":"mochi"}"#);
        let dev = TempFolder::new("dev-pack");
        dev.write("avatar.json", "\u{feff}{\"id\":\"whale\"}".as_bytes());
        let shadowed = TempFolder::new("dev-shadowed");
        shadowed.write("avatar.json", br#"{"id":"mochi"}"#);
        let nameless = TempFolder::new("dev-nameless");
        nameless.write("avatar.json", b"not json");

        let avatars = list(
            &store.0,
            &[dev.0.clone(), shadowed.0.clone(), nameless.0.clone()],
        )
        .unwrap();
        let keys: Vec<_> = avatars
            .iter()
            .map(|a| (a.key.as_str(), a.development))
            .collect();
        assert_eq!(keys, [("mochi", false), ("whale", true)]);
    }

    #[test]
    fn refuses_manifests_that_are_too_large_or_not_utf8() {
        let store = TempFolder::new("refuse");
        let big = vec![b' '; nl_assets::rules().max_manifest_bytes as usize + 1];
        store.write("big/avatar.json", &big);
        store.write("latin/avatar.json", &[b'{', 0xe9, b'}']);
        let problems: Vec<_> = list(&store.0, &[])
            .unwrap()
            .into_iter()
            .map(|a| (a.key, a.problem, a.manifest.is_some()))
            .collect();
        assert_eq!(
            problems,
            [
                ("big".to_string(), Some(Problem::ManifestTooLarge), false),
                ("latin".to_string(), Some(Problem::NotUtf8), false),
            ]
        );
    }

    #[test]
    fn parses_urls_for_pack_and_runtime_files_only() {
        assert_eq!(
            parse_target("/a/mochi/idle/01.png"),
            Some(Target::Avatar {
                key: "mochi".into(),
                path: "idle/01.png".into()
            })
        );
        // Slashes escaped, as convertFileSrc writes them, and non-ASCII names.
        assert_eq!(
            parse_target("/a%2Fsea-slime%2F%E6%B5%B7%E7%9B%90.moc3"),
            Some(Target::Avatar {
                key: "sea-slime".into(),
                path: "海盐.moc3".into()
            })
        );
        assert_eq!(
            parse_target("/runtime/shaders/vertshadersrc.vert"),
            Some(Target::Runtime {
                path: "shaders/vertshadersrc.vert".into()
            })
        );
        for refused in [
            "/a/mochi/../secret.png",
            "/a/mochi/%2E%2E/secret.png",
            "/a/mochi/run.js",
            "/a/Mochi/idle.png",
            "/a/mochi",
            "/runtime/../avatars/mochi/a.png",
            "/runtime/page.html",
            "/other/x.png",
            "/a/mochi/bad%zz.png",
            "/a/mochi/%FF.png",
        ] {
            assert_eq!(parse_target(refused), None, "{refused}");
        }
    }

    #[test]
    fn serves_only_regular_files_inside_the_pack() {
        let pack = TempFolder::new("serve");
        pack.write("idle.png", b"png");
        pack.write("frames/1.png", b"one");
        let outside = TempFolder::new("serve-outside");
        outside.write("secret.png", b"secret");

        assert_eq!(read_inside(&pack.0, "idle.png").unwrap(), b"png");
        assert_eq!(read_inside(&pack.0, "frames/1.png").unwrap(), b"one");
        assert!(read_inside(&pack.0, "frames").is_err());
        assert!(read_inside(&pack.0, "absent.png").is_err());

        #[cfg(unix)]
        let linked =
            std::os::unix::fs::symlink(outside.0.join("secret.png"), pack.0.join("link.png"));
        #[cfg(windows)]
        let linked = std::os::windows::fs::symlink_file(
            outside.0.join("secret.png"),
            pack.0.join("link.png"),
        );
        // Creating links needs extra rights on Windows; then only the rest is tested.
        if linked.is_ok() {
            assert!(read_inside(&pack.0, "link.png").is_err());
        }
    }

    #[test]
    fn content_types_follow_the_extension() {
        assert_eq!(content_type("a/B.PNG"), "image/png");
        assert_eq!(content_type("m.model3.json"), "application/json");
        assert_eq!(content_type("m.moc3"), "application/octet-stream");
        assert_eq!(
            content_type("live2dcubismcore.min.js"),
            "text/javascript; charset=utf-8"
        );
    }

    #[test]
    fn serializes_for_the_page() {
        let entry = AvatarEntry {
            key: "mochi".into(),
            manifest: None,
            files: vec![],
            skipped: vec![],
            problem: Some(Problem::TooManyFiles),
            development: true,
        };
        assert_eq!(
            serde_json::to_value(&entry).unwrap(),
            serde_json::json!({ "key": "mochi", "manifest": null, "files": [], "skipped": [], "problem": "too-many-files", "development": true })
        );
        assert_eq!(
            serde_json::to_value(Live2D::RuntimeRefused).unwrap(),
            "runtime-refused"
        );
    }
}
