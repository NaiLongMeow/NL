//! Opening the app's own folders in the system's file manager, for the
//! custom themes (themes.rs) and the avatars (avatars.rs).

use std::path::Path;

/// Opens `dir` in the system's file manager. Callers pass only the app's own
/// folders, never a path the page sends.
pub fn open(dir: &Path) -> Result<(), String> {
    #[cfg(windows)]
    let program = "explorer";
    #[cfg(target_os = "macos")]
    let program = "open";
    #[cfg(all(unix, not(target_os = "macos")))]
    let program = "xdg-open";
    let mut child = std::process::Command::new(program)
        .arg(dir)
        .spawn()
        .map_err(|error| error.to_string())?;
    // Reap the file manager's launcher when it exits, so that it does not
    // linger as a zombie process on Unix. Explorer's exit code means nothing.
    std::thread::spawn(move || {
        let _ = child.wait();
    });
    Ok(())
}
