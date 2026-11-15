//! NL desktop app.
//!
//! One Tauri application with two windows, both declared in tauri.conf.json:
//!
//! - `main`: chat, settings, and memory management (frontend: index.html);
//! - `pet`: the desktop pet, a transparent, frameless, always-on-top window
//!   that only shows the character (frontend: pet.html).
//!
//! Closing the main window leaves the pet on the desktop; the app exits once
//! both are closed. The NL node will run inside this process later (see
//! docs/architecture.md, "桌面端").

mod placement;

use tauri::{Manager, PhysicalPosition};

/// Gap kept between the pet and the screen edges, in physical pixels. Large
/// enough to clear a typical bottom taskbar or dock.
const SCREEN_MARGIN: i32 = 64;

/// Builds and runs the app. Shared by the desktop binary and, through
/// `mobile_entry_point`, by Tauri's mobile targets should they ever be used.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(pet) = app.get_webview_window("pet") {
                // The pet window starts hidden so it never flashes at the
                // default position before being moved to the corner.
                if let Some(monitor) = pet.current_monitor()? {
                    let size = pet.outer_size()?;
                    let (x, y) = placement::bottom_right(
                        (monitor.position().x, monitor.position().y),
                        (monitor.size().width, monitor.size().height),
                        (size.width, size.height),
                        SCREEN_MARGIN,
                    );
                    pet.set_position(PhysicalPosition::new(x, y))?;
                }
                pet.show()?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("the Tauri application failed to start");
}
