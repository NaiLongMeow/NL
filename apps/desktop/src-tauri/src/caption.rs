//! The caption behind the system's buttons where Windows will not color it
//! (UI design note, section 5, the title bar).
//!
//! The title bar (titlebar.rs) lets DWM keep drawing the minimize, maximize,
//! and close buttons over a strip of its own caption. DWM paints that strip
//! in the color it is given (`DWMWA_CAPTION_COLOR`, set by titlebar.rs's
//! `set_caption_color`), so the page gives it its title bar's color. The
//! attribute is documented for Windows 11; Windows 10 22H2 (build 19045)
//! honors it too, measured 2026-11-19. Where DWM refuses it, as older Windows
//! 10 builds may (not yet seen), the strip keeps the system's default
//! caption: white, or black when `DWMWA_USE_IMMERSIVE_DARK_MODE` is on. There
//! the page paints its title bar in the system's caption color instead, and
//! these commands tell it which case it is in and switch the system caption
//! between light and dark with the page's mode.
//!
//! The dark-mode attribute is set here directly. Tauri's `setTheme()` would
//! set it too, but it also changes the page's `prefers-color-scheme`.

use windows::Win32::Foundation::HWND;
use windows::Win32::Graphics::Dwm::{
    DWMWA_CAPTION_COLOR, DWMWA_COLOR_DEFAULT, DWMWA_USE_IMMERSIVE_DARK_MODE, DwmSetWindowAttribute,
};
use windows::Win32::Graphics::Gdi::{RDW_FRAME, RDW_INVALIDATE, RedrawWindow};

fn hwnd(window: &tauri::WebviewWindow) -> Result<HWND, String> {
    // `hwnd()` returns Tauri's `windows` HWND; rewrap the raw handle as this crate's HWND.
    Ok(HWND(window.hwnd().map_err(|error| error.to_string())?.0))
}

/// Whether DWM colors this window's caption. The probe asks DWM for its
/// default caption color, which fails where the attribute does not exist.
/// Call it before coloring the caption, since where it succeeds it resets
/// the color.
#[tauri::command]
pub fn caption_color_supported(window: tauri::WebviewWindow) -> Result<bool, String> {
    let hwnd = hwnd(&window)?;
    let value = DWMWA_COLOR_DEFAULT;
    // SAFETY: a window handle Tauri owns, and the 4-byte COLORREF the
    // attribute expects.
    let result = unsafe {
        DwmSetWindowAttribute(
            hwnd,
            DWMWA_CAPTION_COLOR,
            &value as *const u32 as *const _,
            size_of::<u32>() as u32,
        )
    };
    Ok(result.is_ok())
}

/// Switches the system's caption, and so its buttons, between light and dark.
/// Only needed where DWM refuses a caption color; elsewhere the caption
/// takes the page's color.
#[tauri::command]
pub fn set_caption_dark(window: tauri::WebviewWindow, dark: bool) -> Result<(), String> {
    let hwnd = hwnd(&window)?;
    // A Win32 BOOL: a 4-byte integer, 1 for true.
    let value = i32::from(dark);
    // SAFETY: as above, with the 4-byte BOOL the attribute expects. The
    // redraw makes DWM repaint the caption now rather than at the next
    // activation.
    unsafe {
        DwmSetWindowAttribute(
            hwnd,
            DWMWA_USE_IMMERSIVE_DARK_MODE,
            &value as *const i32 as *const _,
            size_of::<i32>() as u32,
        )
        .map_err(|error| error.to_string())?;
        let _ = RedrawWindow(Some(hwnd), None, None, RDW_FRAME | RDW_INVALIDATE);
    }
    Ok(())
}
