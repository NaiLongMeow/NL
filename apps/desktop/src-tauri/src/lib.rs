//! NL desktop app.
//!
//! One Tauri application with two windows, both declared in tauri.conf.json:
//!
//! - `main`: chat, settings, and memory management (frontend: index.html);
//! - `pet`: the desktop pet, a transparent, frameless, always-on-top window
//!   that only shows the character (frontend: pet.html).
//!
//! The pet's right-click menu, and what closing either window does, are in
//! pet.rs: NL keeps running while one of its windows can be seen. The NL node
//! will run inside this process later (see docs/architecture.md, "桌面端").
//!
//! On Windows the main window draws its own title bar while the system keeps
//! drawing the caption buttons (titlebar.rs, and caption.rs where Windows
//! will not color the caption behind them),
//! and both windows are kept from behaving like a browser (webview.rs). The
//! main window also lists the user's custom themes (themes.rs) and the
//! avatars they install, whose files both windows load through the
//! `nlavatar` URI scheme (avatars.rs).

mod avatars;
#[cfg(windows)]
mod caption;
mod folders;
mod pet;
mod placement;
mod themes;
// titlebar.rs is the verified module of the tauri-custom-titlebar recipe,
// kept byte for byte as it is, so that it can be compared with and replaced
// by newer versions: rustfmt leaves it alone, and the 2021-edition habit of
// calling unsafe functions inside unsafe functions without an inner `unsafe`
// block is allowed for it.
#[cfg(windows)]
#[rustfmt::skip]
#[allow(unsafe_op_in_unsafe_fn)]
mod titlebar;
mod webview;

use tauri::{Manager, PhysicalPosition};

/// Gap kept between the pet and the screen edges, in physical pixels. Large
/// enough to clear a typical bottom taskbar or dock.
const SCREEN_MARGIN: i32 = 64;

/// Builds and runs the app. Shared by the desktop binary and, through
/// `mobile_entry_point`, by Tauri's mobile targets should they ever be used.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let context = tauri::generate_context!();
    // Only a development build may show pages from the development server.
    let dev_url = if cfg!(debug_assertions) {
        context.config().build.dev_url.clone()
    } else {
        None
    };
    tauri::Builder::default()
        .plugin(webview::navigation_guard(dev_url))
        // Code avatars run sandboxed; this is the part of the sandbox that
        // takes WebRTC away from their frames (avatars.rs).
        .plugin(avatars::sandbox_guard())
        // System notifications for messages that arrive while NL is in the
        // background and the pet is not shown (UI design note, section 4.14).
        .plugin(tauri_plugin_notification::init())
        .on_menu_event(|app, event| pet::on_menu_event(app, event.id().as_ref()))
        .on_window_event(pet::on_window_event)
        // Avatar files are read on a worker thread, so that a large texture
        // never holds up the window that asked for it.
        .register_asynchronous_uri_scheme_protocol(
            avatars::SCHEME,
            |context, request, responder| {
                let app = context.app_handle().clone();
                std::thread::spawn(move || responder.respond(avatars::respond(&app, &request)));
            },
        )
        .setup(|app| {
            #[cfg(windows)]
            {
                titlebar::install(
                    &app.get_webview_window("main")
                        .expect("the main window is declared in tauri.conf.json"),
                )?;
                // Every build turns the browser's keys off, unless a
                // development build asks to keep them (webview.rs).
                if !webview::keeps_browser_keys(
                    cfg!(debug_assertions),
                    std::env::var_os("NL_DEV_BROWSER_KEYS").as_deref(),
                ) {
                    for window in app.webview_windows().values() {
                        webview::disable_browser_keys(window)?;
                    }
                }
            }
            if let Some(pet) = app.get_webview_window("pet") {
                // The pet window starts hidden so it never flashes at the
                // default position before being moved to the corner; the main
                // window shows it unless the user hid it (pet.rs). Its size
                // comes from tauri.conf.json because a hidden window cannot
                // report it reliably on every platform (see placement.rs).
                let configured = app
                    .config()
                    .app
                    .windows
                    .iter()
                    .find(|window| window.label == "pet")
                    .map(|window| (window.width, window.height));
                if let (Some(monitor), Some(logical_size)) = (pet.current_monitor()?, configured) {
                    let (x, y) = placement::bottom_right(
                        (monitor.position().x, monitor.position().y),
                        (monitor.size().width, monitor.size().height),
                        placement::physical_size(logical_size, monitor.scale_factor()),
                        SCREEN_MARGIN,
                    );
                    pet.set_position(PhysicalPosition::new(x, y))?;
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            #[cfg(windows)]
            titlebar::titlebar_insets,
            #[cfg(windows)]
            titlebar::set_caption_color,
            #[cfg(windows)]
            caption::caption_color_supported,
            #[cfg(windows)]
            caption::set_caption_dark,
            themes::custom_themes,
            themes::open_custom_themes_folder,
            avatars::avatars,
            avatars::open_avatars_folder,
            pet::pet_menu,
            pet::set_pet_shown,
            pet::open_main,
        ])
        .run(context)
        .expect("the Tauri application failed to start");
}
