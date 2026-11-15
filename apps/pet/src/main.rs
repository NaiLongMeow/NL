//! NL desktop pet.
//!
//! A separate process from the Flutter main app so that it can own a
//! transparent, frameless, always-on-top window and host a webview without the
//! limitations Flutter desktop has there (see docs/architecture.md, "桌面端").
//! The webview will load the shared avatar renderer from web/stage; until that
//! is wired up it shows a built-in placeholder.

// Release builds on Windows must not open a console window behind the pet.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod command;
mod placement;

use command::PetCommand;
use tao::dpi::{LogicalSize, PhysicalPosition};
use tao::event::{Event, WindowEvent};
use tao::event_loop::{ControlFlow, EventLoopBuilder};
use tao::window::WindowBuilder;
use wry::WebViewBuilder;

/// Logical size of the pet window.
const WINDOW_SIZE: (f64, f64) = (240.0, 320.0);
/// Gap kept between the pet and the screen edges, in physical pixels. Large
/// enough to clear a typical bottom taskbar or dock.
const SCREEN_MARGIN: i32 = 64;

/// Shown until the stage renderer is connected. The page background must stay
/// transparent so only the character itself is visible on the desktop.
const PLACEHOLDER_HTML: &str = r#"<!doctype html>
<html>
<head><meta charset="utf-8"><style>
  html, body { margin: 0; height: 100%; background: transparent; overflow: hidden;
               font-family: system-ui, sans-serif; user-select: none; }
  #pet { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
         width: 160px; height: 160px; border-radius: 50%;
         background: radial-gradient(circle at 35% 35%, #ffe08a, #f5a623);
         display: flex; align-items: center; justify-content: center;
         color: #5a3a00; font-size: 40px; font-weight: 700; cursor: grab; }
  #hint { position: absolute; bottom: 8px; width: 100%; text-align: center;
          font-size: 12px; color: #fff; text-shadow: 0 1px 2px #000; }
</style></head>
<body>
  <div id="pet">NL</div>
  <div id="hint">拖动移动 · 双击退出</div>
  <script>
    const pet = document.getElementById("pet");
    // Dragging starts only once the pointer has moved a few pixels with the
    // button held. Starting it on mousedown would hand the mouse to the OS move
    // loop immediately and swallow the clicks that make up a double-click.
    const DRAG_THRESHOLD = 4;
    let pressedAt = null;
    pet.addEventListener("mousedown", (e) => {
      if (e.button === 0) pressedAt = { x: e.screenX, y: e.screenY };
    });
    window.addEventListener("mouseup", () => { pressedAt = null; });
    window.addEventListener("mousemove", (e) => {
      if (!pressedAt || (e.buttons & 1) === 0) return;
      if (Math.hypot(e.screenX - pressedAt.x, e.screenY - pressedAt.y) >= DRAG_THRESHOLD) {
        pressedAt = null;
        window.ipc.postMessage("drag");
      }
    });
    pet.addEventListener("dblclick", () => window.ipc.postMessage("quit"));
  </script>
</body>
</html>"#;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Commands from the page arrive on the webview's IPC thread, so they are
    // forwarded to the event loop, the only place allowed to touch the window.
    let event_loop = EventLoopBuilder::<PetCommand>::with_user_event().build();
    let proxy = event_loop.create_proxy();

    let builder = WindowBuilder::new()
        .with_title("NL")
        .with_transparent(true)
        .with_decorations(false)
        .with_always_on_top(true)
        .with_resizable(false)
        .with_inner_size(LogicalSize::new(WINDOW_SIZE.0, WINDOW_SIZE.1));
    // tao enables a drop shadow on undecorated Windows windows by default
    // (despite its docs saying otherwise). With the shadow on at creation, the
    // window paints an opaque white background and transparency is lost, and a
    // rectangular shadow would outline the pet anyway, so it is turned off.
    #[cfg(target_os = "windows")]
    let builder = {
        use tao::platform::windows::WindowBuilderExtWindows;
        builder.with_undecorated_shadow(false)
    };
    let window = builder.build(&event_loop)?;

    if let Some(monitor) = window.current_monitor() {
        let (x, y) = placement::bottom_right(
            (monitor.position().x, monitor.position().y),
            (monitor.size().width, monitor.size().height),
            (window.outer_size().width, window.outer_size().height),
            SCREEN_MARGIN,
        );
        window.set_outer_position(PhysicalPosition::new(x, y));
    }

    let builder = WebViewBuilder::new()
        .with_transparent(true)
        .with_html(PLACEHOLDER_HTML)
        .with_ipc_handler(move |request| {
            if let Some(command) = PetCommand::parse(request.body()) {
                // Sending only fails once the event loop has exited, when
                // there is nothing left to command.
                let _ = proxy.send_event(command);
            }
        });

    // Linux has no native child-window webview; wry embeds WebKitGTK into the
    // window's GTK container instead.
    #[cfg(not(target_os = "linux"))]
    let webview = builder.build(&window)?;
    #[cfg(target_os = "linux")]
    let webview = {
        use tao::platform::unix::WindowExtUnix;
        use wry::WebViewBuilderExtUnix;
        let vbox = window.default_vbox().ok_or("window has no GTK container")?;
        builder.build_gtk(vbox)?
    };

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;
        // Keep the webview alive for as long as the event loop runs.
        let _ = &webview;
        match event {
            Event::UserEvent(PetCommand::Drag) => {
                let _ = window.drag_window();
            }
            Event::UserEvent(PetCommand::Quit)
            | Event::WindowEvent {
                event: WindowEvent::CloseRequested,
                ..
            } => {
                *control_flow = ControlFlow::Exit;
            }
            _ => {}
        }
    });
}
