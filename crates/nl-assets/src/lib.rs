//! Asset packs: the avatar packs that give the character a look, and the
//! Live2D runtime that Live2D avatars need.
//!
//! An **avatar pack** is a folder of data files with an `avatar.json`
//! manifest: images for the light rendition, a Live2D model for the Live2D
//! rendition, or both. Its format is published with the `nl-avatar` agent
//! skill (skills/nl-avatar/references/format.md), which agents use to turn a
//! user's art into a pack. The file rules, which extensions a pack may hold
//! and how large it may grow, live in one file,
//! skills/nl-avatar/scripts/lib/rules.json, read both by the skill's checker
//! and by this crate ([`rules`]), so that a pack the checker accepts is a pack
//! the app accepts. The manifest itself is checked by the same JavaScript
//! code in the skill, the main window, and the stage renderer; this crate
//! enforces what keeps the app safe: only data files, only inside the pack.
//!
//! A **runtime pack** holds executable code (Cubism Core, the Cubism Web
//! Framework, shaders), which no avatar pack may contain. NL never ships it
//! (Cubism Core is proprietary), and a release accepts only a runtime whose
//! [`runtime_digest`] it pins, so no code can reach the renderer unless the
//! release vouches for it.
//!
//! Every client runs these same checks: the desktop app, the Flutter apps,
//! and `nl-node` when it stores packs for other devices.

use std::io;
use std::path::Path;
use std::sync::OnceLock;

use serde::Deserialize;
use sha2::{Digest, Sha256};

/// The file rules shared with the `nl-avatar` skill's checker.
#[derive(Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Rules {
    /// The manifest's file name at the root of an avatar pack.
    pub manifest: String,
    /// Extensions a pack may hold, lowercase, without the dot. Anything a
    /// webview would run (`.js`, `.html`, `.svg`, `.wasm`) is absent on
    /// purpose: code may only come from a digest-pinned runtime pack.
    pub extensions: Vec<String>,
    /// Extensions of the images a light rendition may use.
    pub image_extensions: Vec<String>,
    pub max_total_bytes: u64,
    pub max_files: usize,
    pub max_manifest_bytes: u64,
}

/// The file rules, read once from rules.json, which is compiled in.
pub fn rules() -> &'static Rules {
    static RULES: OnceLock<Rules> = OnceLock::new();
    RULES.get_or_init(|| {
        serde_json::from_str(include_str!(
            "../../../skills/nl-avatar/scripts/lib/rules.json"
        ))
        .expect("rules.json is valid, as the tests check")
    })
}

/// Extensions a runtime pack may hold: Cubism Core and the Cubism Web
/// Framework (JavaScript, Core with its WebAssembly inside), the framework's
/// WebGL shaders, and their license texts.
pub const RUNTIME_EXTENSIONS: &[&str] = &["js", "frag", "vert", "txt", "md"];

/// One file inside a pack, as listed by whoever unpacked or read it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PackFile {
    /// Path relative to the pack root, using `/` separators.
    pub path: String,
    /// Uncompressed size in bytes.
    pub size: u64,
    /// SHA-256 of the file contents.
    pub sha256: [u8; 32],
}

/// Upper bounds that keep a hostile or broken pack from exhausting storage.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PackLimits {
    pub max_total_bytes: u64,
    pub max_files: usize,
}

impl Default for PackLimits {
    /// The limits of rules.json: generous enough for detailed Live2D models
    /// with voice lines.
    fn default() -> Self {
        Self {
            max_total_bytes: rules().max_total_bytes,
            max_files: rules().max_files,
        }
    }
}

/// Why a pack was refused.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PackError {
    Empty,
    TooManyFiles {
        count: usize,
        max: usize,
    },
    TooLarge {
        total: u64,
        max: u64,
    },
    /// Absolute, parent-escaping, backslash-separated, or otherwise unsafe path.
    UnsafePath(String),
    DisallowedExtension(String),
}

impl std::fmt::Display for PackError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PackError::Empty => write!(f, "pack contains no files"),
            PackError::TooManyFiles { count, max } => {
                write!(f, "pack has {count} files, more than the limit of {max}")
            }
            PackError::TooLarge { total, max } => {
                write!(f, "pack is {total} bytes, more than the limit of {max}")
            }
            PackError::UnsafePath(path) => write!(f, "unsafe path in pack: {path}"),
            PackError::DisallowedExtension(path) => {
                write!(f, "file type not allowed in a pack: {path}")
            }
        }
    }
}

impl std::error::Error for PackError {}

/// Checks that `files` form an acceptable data pack, before a pack that
/// arrives as an archive (imported, or fetched from another node) is
/// written to storage: limits, safe paths, allowed extensions only.
pub fn validate_pack(files: &[PackFile], limits: PackLimits) -> Result<(), PackError> {
    if files.is_empty() {
        return Err(PackError::Empty);
    }
    if files.len() > limits.max_files {
        return Err(PackError::TooManyFiles {
            count: files.len(),
            max: limits.max_files,
        });
    }
    // Saturating so that absurd per-file sizes cannot wrap around the limit.
    let total = files
        .iter()
        .fold(0u64, |sum, file| sum.saturating_add(file.size));
    if total > limits.max_total_bytes {
        return Err(PackError::TooLarge {
            total,
            max: limits.max_total_bytes,
        });
    }
    for file in files {
        if !is_safe_path(&file.path) {
            return Err(PackError::UnsafePath(file.path.clone()));
        }
        if !has_extension(&file.path, &rules().extensions) {
            return Err(PackError::DisallowedExtension(file.path.clone()));
        }
    }
    Ok(())
}

/// A path that stays inside the pack root once joined onto it on any OS.
/// The skill's checker applies the same rule (`isSafePath` in format.ts).
pub fn is_safe_path(path: &str) -> bool {
    !path.is_empty()
        && !path.starts_with('/')
        // Backslashes and drive letters only mean something on Windows, which is
        // exactly where they would let a path escape the pack directory.
        && !path.contains('\\')
        && !path.contains(':')
        && !path.contains('\0')
        && path.split('/').all(|part| !part.is_empty() && part != "." && part != "..")
}

/// Whether a data pack may hold a file at `path`: a safe path with an
/// allowed extension.
pub fn is_allowed_file(path: &str) -> bool {
    is_safe_path(path) && has_extension(path, &rules().extensions)
}

/// Whether a runtime pack may hold a file at `path`.
pub fn is_runtime_file(path: &str) -> bool {
    is_safe_path(path) && has_extension(path, RUNTIME_EXTENSIONS)
}

/// The lowercase extension of the path's file name; None for none (a
/// dotfile such as ".hidden" has none).
pub fn extension(path: &str) -> Option<String> {
    let file_name = path.rsplit('/').next().unwrap_or(path);
    match file_name.rsplit_once('.') {
        Some((stem, ext)) if !stem.is_empty() => Some(ext.to_ascii_lowercase()),
        _ => None,
    }
}

fn has_extension<S: AsRef<str>>(path: &str, allowed: &[S]) -> bool {
    extension(path).is_some_and(|ext| allowed.iter().any(|allowed| allowed.as_ref() == ext))
}

/// A file found by [`scan_dir`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DirFile {
    /// Path relative to the scanned folder, using `/` separators.
    pub path: String,
    pub size: u64,
}

/// Why [`scan_dir`] left a file out.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Skipped {
    /// Not a file the rules allow.
    NotAllowed,
    /// A symbolic link (or, on Windows, a junction), which is never followed.
    Link,
    /// A name that is not valid Unicode, which no manifest can name.
    NotUnicode,
}

/// What a folder holds under a set of file rules.
#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct DirScan {
    /// Allowed files, sorted by path.
    pub files: Vec<DirFile>,
    pub skipped: Vec<(String, Skipped)>,
    /// Whether the scan stopped early because the folder holds more files
    /// than `max_files` or is nested deeper than [`MAX_DEPTH`].
    pub truncated: bool,
}

/// How deep [`scan_dir`] descends into folders; packs are shallow, and the
/// bound keeps a pathological folder from taking long.
pub const MAX_DEPTH: usize = 16;

/// Lists the files under `dir` that `allowed` accepts, without following
/// links. Stops early once more than `max_files` allowed files are found, so
/// a huge folder costs little: the caller sees a truncated scan and refuses
/// it.
pub fn scan_dir(dir: &Path, allowed: fn(&str) -> bool, max_files: usize) -> io::Result<DirScan> {
    let mut scan = DirScan::default();
    walk(dir, "", 0, allowed, max_files, &mut scan)?;
    scan.files.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(scan)
}

fn walk(
    dir: &Path,
    prefix: &str,
    depth: usize,
    allowed: fn(&str) -> bool,
    max_files: usize,
    scan: &mut DirScan,
) -> io::Result<()> {
    if depth > MAX_DEPTH {
        scan.truncated = true;
        return Ok(());
    }
    for entry in std::fs::read_dir(dir)? {
        if scan.files.len() > max_files {
            scan.truncated = true;
            return Ok(());
        }
        let entry = entry?;
        let name = entry.file_name();
        let Some(name) = name.to_str() else {
            scan.skipped.push((
                format!("{prefix}{}", name.to_string_lossy()),
                Skipped::NotUnicode,
            ));
            continue;
        };
        let path = format!("{prefix}{name}");
        // DirEntry::file_type describes the entry itself, never a link's target.
        let kind = entry.file_type()?;
        if kind.is_symlink() {
            scan.skipped.push((path, Skipped::Link));
        } else if kind.is_dir() {
            walk(
                &entry.path(),
                &format!("{path}/"),
                depth + 1,
                allowed,
                max_files,
                scan,
            )?;
        } else if kind.is_file() && allowed(&path) {
            let size = entry.metadata()?.len();
            scan.files.push(DirFile { path, size });
        } else {
            scan.skipped.push((path, Skipped::NotAllowed));
        }
    }
    Ok(())
}

/// Digest that identifies a runtime pack's exact contents.
///
/// SHA-256 over the lines `"{path}\0{sha256 hex}\n"` sorted by path. Hashing
/// the per-file digests rather than the archive makes the result independent
/// of zip compression, timestamps, and entry order, so the same files always
/// give the same digest no matter who built the archive.
pub fn runtime_digest(files: &[PackFile]) -> [u8; 32] {
    let mut sorted: Vec<&PackFile> = files.iter().collect();
    sorted.sort_by(|a, b| a.path.cmp(&b.path));
    let mut hasher = Sha256::new();
    for file in sorted {
        hasher.update(file.path.as_bytes());
        hasher.update(b"\0");
        hasher.update(to_hex(&file.sha256).as_bytes());
        hasher.update(b"\n");
    }
    hasher.finalize().into()
}

/// Reads and hashes the runtime files under `dir`, for [`runtime_digest`].
/// Links and files a runtime may not hold are left out, and so do not count
/// towards the digest; they are never served either.
pub fn hash_runtime_dir(dir: &Path) -> io::Result<Vec<PackFile>> {
    let scan = scan_dir(dir, is_runtime_file, 256)?;
    scan.files
        .into_iter()
        .map(|file| {
            let bytes = std::fs::read(dir.join(&file.path))?;
            Ok(PackFile {
                path: file.path,
                size: bytes.len() as u64,
                sha256: Sha256::digest(&bytes).into(),
            })
        })
        .collect()
}

/// Lowercase hex encoding, used for digests in manifests and logs.
pub fn to_hex(bytes: &[u8]) -> String {
    const DIGITS: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push(DIGITS[usize::from(byte >> 4)] as char);
        out.push(DIGITS[usize::from(byte & 0x0f)] as char);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn file(path: &str, size: u64) -> PackFile {
        PackFile {
            path: path.to_string(),
            size,
            sha256: Sha256::digest(path.as_bytes()).into(),
        }
    }

    /// A fresh, empty folder under the system's temp directory, removed on drop.
    struct TempFolder(PathBuf);

    impl TempFolder {
        fn new(name: &str) -> Self {
            let path =
                std::env::temp_dir().join(format!("nl-assets-{}-{name}", std::process::id()));
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
    fn rules_are_shared_with_the_skill() {
        let rules = rules();
        assert_eq!(rules.manifest, "avatar.json");
        for ext in ["json", "moc3", "png", "gif", "webp"] {
            assert!(rules.extensions.iter().any(|e| e == ext), "{ext}");
        }
        for ext in ["js", "html", "svg", "wasm"] {
            assert!(!rules.extensions.iter().any(|e| e == ext), "{ext}");
        }
        assert!(
            rules
                .image_extensions
                .iter()
                .all(|ext| rules.extensions.contains(ext))
        );
        assert_eq!(PackLimits::default().max_files, rules.max_files);
    }

    #[test]
    fn typical_pack_is_accepted() {
        let files = [
            file("avatar.json", 512),
            file("model/haru.model3.json", 2048),
            file("model/haru.moc3", 1 << 20),
            file("model/textures/texture_00.PNG", 1 << 21),
            file("idle.gif", 1 << 16),
            file("voice/hello.wav", 1 << 16),
        ];
        assert_eq!(validate_pack(&files, PackLimits::default()), Ok(()));
    }

    #[test]
    fn empty_pack_is_refused() {
        assert_eq!(
            validate_pack(&[], PackLimits::default()),
            Err(PackError::Empty)
        );
    }

    #[test]
    fn code_and_active_content_are_refused() {
        for path in [
            "stage.js",
            "index.html",
            "logo.svg",
            "core.wasm",
            "Makefile",
            ".hidden",
        ] {
            let result = validate_pack(&[file(path, 1)], PackLimits::default());
            assert_eq!(
                result,
                Err(PackError::DisallowedExtension(path.to_string())),
                "{path}"
            );
            assert!(!is_allowed_file(path), "{path}");
        }
    }

    #[test]
    fn paths_escaping_the_pack_root_are_refused() {
        for path in [
            "../evil.png",
            "model/../../evil.png",
            "/etc/evil.png",
            "model\\evil.png",
            "C:/evil.png",
            "model//evil.png",
            "./evil.png",
            "",
        ] {
            let result = validate_pack(&[file(path, 1)], PackLimits::default());
            assert_eq!(
                result,
                Err(PackError::UnsafePath(path.to_string())),
                "{path:?}"
            );
            assert!(!is_allowed_file(path), "{path:?}");
        }
    }

    #[test]
    fn limits_are_enforced() {
        let limits = PackLimits {
            max_total_bytes: 100,
            max_files: 2,
        };
        let three = [file("a.png", 1), file("b.png", 1), file("c.png", 1)];
        assert_eq!(
            validate_pack(&three, limits),
            Err(PackError::TooManyFiles { count: 3, max: 2 })
        );
        let big = [file("a.png", 60), file("b.png", 41)];
        assert_eq!(
            validate_pack(&big, limits),
            Err(PackError::TooLarge {
                total: 101,
                max: 100
            })
        );
    }

    #[test]
    fn size_overflow_cannot_sneak_under_the_limit() {
        let files = [file("a.png", u64::MAX), file("b.png", 2)];
        assert!(matches!(
            validate_pack(&files, PackLimits::default()),
            Err(PackError::TooLarge { .. })
        ));
    }

    #[test]
    fn runtime_files_are_code_and_shaders_only() {
        for path in ["live2dcubismcore.min.js", "shaders/a.frag", "LICENSE.md"] {
            assert!(is_runtime_file(path), "{path}");
        }
        for path in ["page.html", "model.moc3", "../core.js"] {
            assert!(!is_runtime_file(path), "{path}");
        }
    }

    #[test]
    fn scan_lists_allowed_files_and_skips_the_rest() {
        let folder = TempFolder::new("scan");
        folder.write("avatar.json", b"{}");
        folder.write("idle/02.png", b"png");
        folder.write("idle/01.png", b"png!");
        folder.write("tools/run.js", b"alert(1)");
        folder.write("draft.psd", b"psd");
        let scan = scan_dir(&folder.0, is_allowed_file, 100).unwrap();
        assert_eq!(
            scan.files,
            vec![
                DirFile {
                    path: "avatar.json".into(),
                    size: 2
                },
                DirFile {
                    path: "idle/01.png".into(),
                    size: 4
                },
                DirFile {
                    path: "idle/02.png".into(),
                    size: 3
                },
            ]
        );
        let mut skipped = scan.skipped.clone();
        skipped.sort_by(|a, b| a.0.cmp(&b.0));
        assert_eq!(
            skipped,
            vec![
                ("draft.psd".to_string(), Skipped::NotAllowed),
                ("tools/run.js".to_string(), Skipped::NotAllowed),
            ]
        );
        assert!(!scan.truncated);
    }

    #[test]
    fn scan_stops_early_on_a_huge_folder() {
        let folder = TempFolder::new("huge");
        for index in 0..10 {
            folder.write(&format!("{index}.png"), b"png");
        }
        let scan = scan_dir(&folder.0, is_allowed_file, 3).unwrap();
        assert!(scan.truncated);
        assert!(scan.files.len() <= 4);
    }

    #[test]
    fn scan_does_not_follow_links() {
        let folder = TempFolder::new("links");
        let outside = TempFolder::new("links-outside");
        outside.write("secret.png", b"png");
        #[cfg(unix)]
        let linked = std::os::unix::fs::symlink(&outside.0, folder.0.join("elsewhere"));
        #[cfg(windows)]
        let linked = std::os::windows::fs::symlink_dir(&outside.0, folder.0.join("elsewhere"));
        // Creating links needs extra rights on Windows; nothing to test then.
        if linked.is_err() {
            return;
        }
        let scan = scan_dir(&folder.0, is_allowed_file, 100).unwrap();
        assert!(scan.files.is_empty());
        assert_eq!(scan.skipped, vec![("elsewhere".to_string(), Skipped::Link)]);
    }

    #[test]
    fn runtime_digest_ignores_listing_order() {
        let a = [file("runtime/core.js", 1), file("runtime/framework.js", 1)];
        let b = [a[1].clone(), a[0].clone()];
        assert_eq!(runtime_digest(&a), runtime_digest(&b));
    }

    #[test]
    fn runtime_digest_changes_when_any_file_changes() {
        let original = [file("runtime/core.js", 1)];
        let mut tampered = original.clone();
        tampered[0].sha256[0] ^= 1;
        assert_ne!(runtime_digest(&original), runtime_digest(&tampered));
    }

    #[test]
    fn runtime_digest_matches_documented_recipe() {
        // Recompute the recipe by hand to pin the exact byte format, since other
        // tools (pack builders, release scripts) must reproduce it.
        let files = [file("b", 1), file("a", 1)];
        let mut expected = Sha256::new();
        for f in [&files[1], &files[0]] {
            expected.update(format!("{}\0{}\n", f.path, to_hex(&f.sha256)).as_bytes());
        }
        let expected: [u8; 32] = expected.finalize().into();
        assert_eq!(runtime_digest(&files), expected);
    }

    #[test]
    fn hashing_a_runtime_folder_covers_its_runtime_files_only() {
        let folder = TempFolder::new("runtime");
        folder.write("live2dcubismcore.min.js", b"core");
        folder.write("shaders/a.frag", b"frag");
        folder.write("notes.png", b"not runtime");
        let files = hash_runtime_dir(&folder.0).unwrap();
        let paths: Vec<_> = files.iter().map(|f| f.path.as_str()).collect();
        assert_eq!(paths, ["live2dcubismcore.min.js", "shaders/a.frag"]);
        let expected: [u8; 32] = Sha256::digest(b"core").into();
        assert_eq!(files[0].sha256, expected);
    }

    #[test]
    fn hex_encoding_is_lowercase_and_padded() {
        assert_eq!(to_hex(&[0x00, 0x0f, 0xab, 0xff]), "000fabff");
    }
}
