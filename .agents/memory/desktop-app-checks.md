---
name: desktop-app-checks
description: Recall before claiming a desktop (Tauri) window, title bar, theme, or webview behavior works on Windows; how to drive and measure the real app rather than the page in a browser.
metadata:
  type: reference
  scope: apps/desktop on Windows; the techniques need a desktop session, not CI
  status: active
  last_verified: 2026-11-19
---

Vitest and the Vite page in a browser do not show what the desktop app does: outside Tauri, `inDesktopApp()` is false, so custom themes, the caption color, and the title bar insets are absent. Four ways to check the real app on Windows:

- **Drive the app's own page.** Start it with `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222` in the environment (`pnpm tauri dev`, or the release exe). `http://127.0.0.1:9222/json` then lists the main and pet pages, and any Chrome DevTools Protocol client (Node's built-in WebSocket is enough) can evaluate script in them, including `window.__TAURI_INTERNALS__.invoke(...)` to call the app's commands. The main page is `http://localhost:1420/` in development and `http://tauri.localhost/` in a release build. Never ship or document the flag as a user setting: it opens the page to any local process.
- **The title bar.** The tauri-custom-titlebar skill's `scripts/verify_windows_titlebar.py "NL"` checks hit-testing, hover, the resize band, and maximize; it moves the real mouse for about 15 s, so warn the user first. It does not check colors.
- **Colors behind the caption buttons.** Screen-grab the window (Pillow `ImageGrab`, per-monitor DPI aware) at the rectangle from `DwmGetWindowAttribute(DWMWA_CAPTION_BUTTON_BOUNDS)`, which is relative to the window rect, and compare with the bar beside it. Bring the window forward with `AttachThreadInput` and `SetForegroundWindow` rather than injected keys, and sample active and inactive.
- **Browser keys.** They are turned off only in release builds: `pnpm tauri build --no-bundle` in apps/desktop gives `target/release/nl-desktop.exe`. Send keys with `SendInput` only while NL is the foreground window, and prove each key arrived (a capturing `keydown` listener) before taking "nothing happened" as a pass.

**Evidence:** All four were used on 2026-11-19 on Windows 10 22H2 at 150% scale: the verify script printed ALL PASS; the caption matched the bar in light, dark, and custom themes; the release build ignored F5, Ctrl+R, Ctrl+Shift+R, Alt+Left, F12, Ctrl+Shift+I, Ctrl+P, Ctrl+F, and Ctrl+plus while each key reached the page. The same measurements showed that Windows 10 22H2 honors `DWMWA_CAPTION_COLOR` (src-tauri/src/caption.rs).

**Recheck when:** Tauri or wry is upgraded (rerun the verify script), WebView2 stops reading the environment variable, or the app's development or release origin changes.
