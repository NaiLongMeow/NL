//! The pet window's menu, and how the two windows close (UI design note,
//! section 6).
//!
//! A right click on the pet opens a native menu, built here from the words
//! the pet window sends in the user's language: open NL, Settings, hide the
//! pet, quit NL. A native menu, unlike one drawn in the page, is not cut off
//! by the pet's small window.
//!
//! The app lives as long as one of its windows can be seen:
//!
//! - closing the main window hides it while the pet is shown, so that the
//!   pet's menu can open it again, and quits NL otherwise;
//! - closing the pet only hides it, like its menu's "hide" does, and the
//!   main window comes back if it was hidden, so that NL never runs with no
//!   window at all;
//! - whether the pet is shown is a setting kept by the main window, which
//!   shows or hides the pet when it starts and whenever the setting changes
//!   (`set_pet_shown`). Every change is announced to both windows
//!   (`SHOWN_EVENT`), so that Settings follows a pet hidden from its menu.

use serde::Deserialize;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::{AppHandle, Emitter, Manager, Runtime, WebviewWindow, Window, WindowEvent};

/// The windows' labels in tauri.conf.json.
pub const MAIN: &str = "main";
pub const PET: &str = "pet";

/// Sent to every window when the pet is shown or hidden; the payload is `true` or `false`.
pub const SHOWN_EVENT: &str = "nl-pet-shown";
/// Sent to the main window when the pet's menu asks for Settings.
pub const SETTINGS_EVENT: &str = "nl-open-settings";

/// The menu's item ids, which come back in the app's menu events.
const OPEN: &str = "pet-open";
const SETTINGS: &str = "pet-settings";
const HIDE: &str = "pet-hide";
const QUIT: &str = "pet-quit";

/// The menu's words, in the user's language, as the pet window sends them.
#[derive(Debug, Deserialize)]
pub struct MenuLabels {
    open: String,
    settings: String,
    hide: String,
    quit: String,
}

/// What closing the main window does.
#[derive(Debug, PartialEq, Eq)]
pub enum MainClose {
    /// Hide it: the pet stays, and its menu opens the window again.
    Hide,
    /// Quit NL: nothing would be left on screen.
    Quit,
}

/// Closing the main window hides it while the pet is shown, and quits NL otherwise.
pub fn main_close(pet_shown: bool) -> MainClose {
    if pet_shown {
        MainClose::Hide
    } else {
        MainClose::Quit
    }
}

/// Whether hiding the pet must bring the main window back: it must when the
/// main window is hidden too, or NL would run with no window at all.
pub fn shows_main_after_hiding_pet(main_visible: bool) -> bool {
    !main_visible
}

/// Opens the pet's menu where the pointer is.
#[tauri::command]
pub async fn pet_menu<R: Runtime>(
    window: WebviewWindow<R>,
    labels: MenuLabels,
) -> Result<(), String> {
    let app = window.app_handle();
    let menu = (|| {
        Menu::with_items(
            app,
            &[
                &MenuItem::with_id(app, OPEN, labels.open, true, None::<&str>)?,
                &MenuItem::with_id(app, SETTINGS, labels.settings, true, None::<&str>)?,
                &PredefinedMenuItem::separator(app)?,
                &MenuItem::with_id(app, HIDE, labels.hide, true, None::<&str>)?,
                &MenuItem::with_id(app, QUIT, labels.quit, true, None::<&str>)?,
            ],
        )
    })()
    .map_err(|error| error.to_string())?;
    window.popup_menu(&menu).map_err(|error| error.to_string())
}

/// Shows or hides the pet, as Settings asks.
#[tauri::command]
pub fn set_pet_shown<R: Runtime>(app: AppHandle<R>, shown: bool) {
    set_shown(&app, shown);
}

/// Acts on a click in the pet's menu; other menus' ids are ignored.
pub fn on_menu_event<R: Runtime>(app: &AppHandle<R>, id: &str) {
    match id {
        OPEN => show_main(app),
        SETTINGS => {
            show_main(app);
            let _ = app.emit_to(MAIN, SETTINGS_EVENT, ());
        }
        HIDE => set_shown(app, false),
        QUIT => app.exit(0),
        _ => {}
    }
}

/// Turns closing either window into what the module comment describes.
pub fn on_window_event<R: Runtime>(window: &Window<R>, event: &WindowEvent) {
    let WindowEvent::CloseRequested { api, .. } = event else {
        return;
    };
    let app = window.app_handle();
    match window.label() {
        MAIN => match main_close(is_visible(app, PET)) {
            MainClose::Hide => {
                api.prevent_close();
                let _ = window.hide();
            }
            MainClose::Quit => app.exit(0),
        },
        PET => {
            api.prevent_close();
            set_shown(app, false);
        }
        _ => {}
    }
}

fn is_visible<R: Runtime>(app: &AppHandle<R>, label: &str) -> bool {
    app.get_webview_window(label)
        .and_then(|window| window.is_visible().ok())
        .unwrap_or(false)
}

/// Brings the main window to the front, from hidden or minimized.
fn show_main<R: Runtime>(app: &AppHandle<R>) {
    if let Some(main) = app.get_webview_window(MAIN) {
        let _ = main.show();
        let _ = main.unminimize();
        let _ = main.set_focus();
    }
}

fn set_shown<R: Runtime>(app: &AppHandle<R>, shown: bool) {
    let Some(pet) = app.get_webview_window(PET) else {
        return;
    };
    if shown {
        let _ = pet.show();
    } else {
        let _ = pet.hide();
        if shows_main_after_hiding_pet(is_visible(app, MAIN)) {
            show_main(app);
        }
    }
    let _ = app.emit(SHOWN_EVENT, shown);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn closing_the_main_window_hides_it_only_while_the_pet_is_shown() {
        assert_eq!(main_close(true), MainClose::Hide);
        assert_eq!(main_close(false), MainClose::Quit);
    }

    #[test]
    fn hiding_the_pet_brings_back_a_hidden_main_window() {
        assert!(shows_main_after_hiding_pet(false));
        assert!(!shows_main_after_hiding_pet(true));
    }

    #[test]
    fn the_menu_words_come_from_the_pet_window() {
        let labels: MenuLabels = serde_json::from_str(
            r#"{"open":"打开 NL","settings":"设置","hide":"隐藏桌宠","quit":"退出 NL"}"#,
        )
        .unwrap();
        assert_eq!(labels.hide, "隐藏桌宠");
    }
}
