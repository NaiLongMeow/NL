//! Character asset packs.
//!
//! Live2D never enters the NL repository (Cubism Core is proprietary), so the
//! avatar runtime and characters arrive as separate packs that users import or
//! nodes fetch (see docs/architecture.md, "角色形象与素材包"):
//!
//! - A **runtime pack** holds executable code (Cubism Core, Cubism Web
//!   Framework, shaders). Each NL release pins one runtime digest, computed by
//!   [`runtime_digest`]; a pack whose digest differs is refused, so no code can
//!   reach the renderer unless the release vouches for it.
//! - A **character pack** holds data only (models, textures, motions, audio,
//!   `character.json`). [`validate_character_pack`] enforces an extension
//!   allow-list, safe relative paths, and size limits, so an imported pack can
//!   neither inject scripts nor write outside its own directory.
//!
//! Every client runs these same checks: the desktop pet, the Flutter apps, and
//! `nl-node` when it stores packs for other devices.

use sha2::{Digest, Sha256};

/// One file inside a pack, as listed by whoever unpacked the archive.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PackFile {
    /// Path relative to the pack root, using `/` separators.
    pub path: String,
    /// Uncompressed size in bytes.
    pub size: u64,
    /// SHA-256 of the file contents.
    pub sha256: [u8; 32],
}

/// Extensions allowed in a character pack. Anything executable or renderable
/// as active content (`.js`, `.html`, `.svg`, `.wasm`, ...) is deliberately
/// absent: code may only come from a digest-pinned runtime pack.
pub const CHARACTER_EXTENSIONS: &[&str] = &[
    "json", "moc3", "png", "jpg", "jpeg", "webp", "wav", "mp3", "txt", "md",
];

/// Upper bounds that keep a hostile or broken pack from exhausting storage.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PackLimits {
    pub max_total_bytes: u64,
    pub max_files: usize,
}

impl Default for PackLimits {
    /// Generous enough for detailed Live2D models with voice lines.
    fn default() -> Self {
        Self {
            max_total_bytes: 400 * 1024 * 1024,
            max_files: 4000,
        }
    }
}

/// Why a character pack was refused.
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
                write!(f, "file type not allowed in a character pack: {path}")
            }
        }
    }
}

impl std::error::Error for PackError {}

/// Checks that `files` form an acceptable character pack.
pub fn validate_character_pack(files: &[PackFile], limits: PackLimits) -> Result<(), PackError> {
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
        if !is_safe_relative_path(&file.path) {
            return Err(PackError::UnsafePath(file.path.clone()));
        }
        if !has_allowed_extension(&file.path) {
            return Err(PackError::DisallowedExtension(file.path.clone()));
        }
    }
    Ok(())
}

/// A path that stays inside the pack root once joined onto it on any OS.
fn is_safe_relative_path(path: &str) -> bool {
    !path.is_empty()
        && !path.starts_with('/')
        // Backslashes and drive letters only mean something on Windows, which is
        // exactly where they would let a path escape the pack directory.
        && !path.contains('\\')
        && !path.contains(':')
        && !path.contains('\0')
        && path.split('/').all(|part| !part.is_empty() && part != "." && part != "..")
}

fn has_allowed_extension(path: &str) -> bool {
    let file_name = path.rsplit('/').next().unwrap_or(path);
    match file_name.rsplit_once('.') {
        // An empty stem means a dotfile such as ".hidden", which has no extension.
        Some((stem, ext)) if !stem.is_empty() => {
            CHARACTER_EXTENSIONS.contains(&ext.to_ascii_lowercase().as_str())
        }
        _ => false,
    }
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

    fn file(path: &str, size: u64) -> PackFile {
        PackFile {
            path: path.to_string(),
            size,
            sha256: Sha256::digest(path.as_bytes()).into(),
        }
    }

    #[test]
    fn typical_character_pack_is_accepted() {
        let files = [
            file("character.json", 512),
            file("model/haru.model3.json", 2048),
            file("model/haru.moc3", 1 << 20),
            file("model/textures/texture_00.PNG", 1 << 21),
            file("voice/hello.wav", 1 << 16),
        ];
        assert_eq!(
            validate_character_pack(&files, PackLimits::default()),
            Ok(())
        );
    }

    #[test]
    fn empty_pack_is_refused() {
        assert_eq!(
            validate_character_pack(&[], PackLimits::default()),
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
            let result = validate_character_pack(&[file(path, 1)], PackLimits::default());
            assert_eq!(
                result,
                Err(PackError::DisallowedExtension(path.to_string())),
                "{path}"
            );
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
            let result = validate_character_pack(&[file(path, 1)], PackLimits::default());
            assert_eq!(
                result,
                Err(PackError::UnsafePath(path.to_string())),
                "{path:?}"
            );
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
            validate_character_pack(&three, limits),
            Err(PackError::TooManyFiles { count: 3, max: 2 })
        );
        let big = [file("a.png", 60), file("b.png", 41)];
        assert_eq!(
            validate_character_pack(&big, limits),
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
            validate_character_pack(&files, PackLimits::default()),
            Err(PackError::TooLarge { .. })
        ));
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
    fn hex_encoding_is_lowercase_and_padded() {
        assert_eq!(to_hex(&[0x00, 0x0f, 0xab, 0xff]), "000fabff");
    }
}
