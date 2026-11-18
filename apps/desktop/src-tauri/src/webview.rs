//! Keeps the app's windows from behaving like a browser (UI design note,
//! section 5, "A window, not a browser").
//!
//! - Every build refuses navigation away from the app's own pages. A link in
//!   a message must open in the system browser; it must never replace the
//!   app inside its own window, where the page's state would be lost and a
//!   remote page would sit in a window the user trusts.
//! - Release builds on Windows turn WebView2's browser accelerator keys off:
//!   F5 and Ctrl+R (reload, which drops the window's state), Ctrl+P (print),
//!   Ctrl+F (find), the zoom keys, Alt+Left and Alt+Right (history), and F12
//!   and Ctrl+Shift+I. Keys the page handles itself still reach it, and text
//!   editing keys (copy, paste, undo) keep working. Development builds keep
//!   reload and the developer tools.
//!
//! What else a browser would do is already off or handled elsewhere: Tauri
//! turns off swipe navigation and pinch zoom by default, wry refuses requests
//! for new windows unless a handler is set, and the page limits the context
//! menu to text fields and selections (src/app/webview.ts), because WebView2
//! can only turn its menu off everywhere, text fields included.

use tauri::plugin::TauriPlugin;
use tauri::{Runtime, Url};

/// Whether `url` is one of the app's own pages: Tauri's app origin
/// (`tauri://localhost` on macOS and Linux, `http://tauri.localhost` on
/// Windows), or, when given, the development server's origin.
pub fn is_app_url(url: &Url, dev_url: Option<&Url>) -> bool {
    let host = url.host_str();
    let app_origin = match url.scheme() {
        "tauri" => host == Some("localhost"),
        "http" | "https" => host == Some("tauri.localhost"),
        _ => false,
    };
    app_origin || dev_url.is_some_and(|dev| url.origin() == dev.origin())
}

/// A plugin that refuses navigation to anything but the app's own pages in
/// every window. Pass the development server's URL only in development
/// builds, so that a release never accepts a page from localhost.
pub fn navigation_guard<R: Runtime>(dev_url: Option<Url>) -> TauriPlugin<R> {
    tauri::plugin::Builder::new("nl-navigation-guard")
        .on_navigation(move |_webview, url| is_app_url(url, dev_url.as_ref()))
        .build()
}

/// Turns WebView2's browser accelerator keys off in `window` (see the module
/// comment). Tauri 2.12 does not expose this setting, although wry has it
/// (`with_browser_accelerator_keys`), so it is set on the WebView2 settings
/// directly. The change runs on the main thread after this returns.
#[cfg(windows)]
pub fn disable_browser_keys<R: Runtime>(window: &tauri::WebviewWindow<R>) -> tauri::Result<()> {
    window.with_webview(|webview| {
        use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2Settings3;
        use windows::core::Interface;

        // SAFETY: COM calls on the controller Tauri hands out, made on the
        // main thread, which owns the WebView2 objects.
        let result = unsafe {
            webview
                .controller()
                .CoreWebView2()
                .and_then(|core| core.Settings())
                .and_then(|settings| settings.cast::<ICoreWebView2Settings3>())
                .and_then(|settings| settings.SetAreBrowserAcceleratorKeysEnabled(false))
        };
        if let Err(error) = result {
            // Not fatal: the window still works, with the browser's keys on.
            eprintln!("nl-desktop: could not turn off the webview's browser keys: {error}");
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn url(text: &str) -> Url {
        Url::parse(text).unwrap()
    }

    #[test]
    fn accepts_the_app_origin_on_every_platform() {
        assert!(is_app_url(&url("tauri://localhost/index.html"), None));
        assert!(is_app_url(&url("http://tauri.localhost/pet.html"), None));
        assert!(is_app_url(&url("https://tauri.localhost/"), None));
    }

    #[test]
    fn refuses_everything_else() {
        for other in [
            "https://example.com/",
            "http://localhost:1420/",
            "http://tauri.localhost.example.com/",
            "tauri://evil/",
            "file:///C:/Windows/",
            "javascript:alert(1)",
            "data:text/html,hi",
        ] {
            assert!(!is_app_url(&url(other), None), "{other}");
        }
    }

    #[test]
    fn accepts_the_development_server_only_when_given_and_only_its_origin() {
        let dev = url("http://localhost:1420/");
        assert!(is_app_url(
            &url("http://localhost:1420/index.html?x=1"),
            Some(&dev)
        ));
        assert!(!is_app_url(&url("http://localhost:1421/"), Some(&dev)));
        assert!(!is_app_url(&url("https://localhost:1420/"), Some(&dev)));
        assert!(!is_app_url(&url("http://localhost:1420/"), None));
    }
}
