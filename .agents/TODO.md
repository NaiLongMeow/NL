# TODO

Outstanding work. Stages, exit criteria, spikes, and budgets are in [plan/roadmap.md](plan/roadmap.md); the rules every item must respect are in [memory/architecture-invariants.md](memory/architecture-invariants.md). Slices marked `[pattern]` set the example later work copies, so they need the strongest model available or a close review. Each stage's design note produces that stage's slices; only the current and next stage are listed here.

## Waiting for the user

- [ ] Review the reworked desktop screens and approve them or ask for changes: shared and device sessions, dispatching, and idle sessions archiving themselves (UI design note, sections 4.10 to 4.12); the title bar; the five color themes and custom themes; the ball avatar; in both languages and both modes. The session model is the agent's reading of the user's 2026-11-18 direction and needs the user's confirmation: what a shared session is and where it runs (open question 10), Accept tasks on by default, and archiving after 30 idle minutes (open question 12). Run `pnpm tauri dev` in apps/desktop; Settings switches language, theme, and mode. Changes the user asks for go into [docs/design/ui.md](../docs/design/ui.md) first.
- [ ] Get a license for the 大肥鱼 art and voice NL will ship (product rule 9). The character is fan-made, grown from 溟月 by the Bilibili creator 上善无形, so the license must come from whoever made the particular art, not from DeepSeek. Until then NL draws only the default ball avatar (UI design note, section 10).
- [ ] Decide on Dependabot alert 1: the Rust crate glib, which Cargo.lock pulls in through the desktop app, has a moderate unsoundness fixed in glib 0.20.
- [ ] Supply a Code of Conduct reporting email to replace `[reporting address to be announced]` in CODE_OF_CONDUCT.md and `[举报邮箱待公布]` in CODE_OF_CONDUCT.zh-CN.md. The user chose to supply it later (2026-11-16).

## Stage 0: Ground

- [ ] Rewrite docs/architecture.md, and the design sections of README.md and README.zh-CN.md, from [memory/distributed-design.md](memory/distributed-design.md) and architecture-invariants. They predate the distributed design and are wrong in many places. Write the new docs/architecture.md in English; a zh-CN translation is optional. What must change:
  - every node runs the harness, the ESP32 and the phone included (the docs say the ESP32 only handles audio and the phone runs no agent loop);
  - the gateway is trusted and required: it is the login system, holds the keys, calls the models, and stores the shared file system (the docs promise end-to-end encryption that hides conversations from the gateway);
  - sessions are local JSONL; memory and compacts live in the shared file system; describe urgent and normal memory, forks, compacts, and remote capabilities;
  - nodes reach each other through the gateway first, with direct routes last (the docs put the connection ladder at the centre);
  - drop MQTT and "扩展脚本走 MCP 或 WASM 沙箱" (extensions are MCP servers outside the node process, T8);
  - leave the avatar format open: it is chosen when Stage 6 starts (P8).

## Stage 1: Design

- [ ] The cue vocabulary, and the default ball avatar in web/stage for the pet and the device faces (UI design note, section 10; the main window draws it in apps/desktop/src/ui/Avatar.tsx). It replaces the orange "NL" disc in web/stage/src/stage.ts, whose colors are the last ones not taken from the design tokens; web/stage then depends on @nl/tokens and runs `nl-tokens` in its scripts like apps/desktop.
- [ ] The remaining main-window screens, following the session screen (apps/desktop/src: the `SessionSource` interface with its scripted fake, typed en and zh-CN catalogs in src/i18n, CSS Modules over the tokens, Testing Library tests): first run and sign-in, character, memory, tools, devices, usage, and the rest of settings (appearance, language, and the idle limit exist). Still missing from the session screen: streaming from scripted event streams, the gallery page with headless screenshots and accessibility checks in CI (UI design note, section 12).
- [ ] The pet window: cue states and menu; tray and autostart with the official Tauri plugins; per-pixel click-through. Verify transparency, dragging, and double-click close on macOS and Linux (Windows 10 was checked by hand; on Linux only window creation and bottom-right placement were checked, on Ubuntu 24.04 under Xvfb without a compositor, so transparency could not be judged).
- [ ] The main window's title bar beyond Windows 10 22H2, where it was measured and passed the title bar checks (2026-11-19): on macOS the Overlay style still needs room for the traffic lights and drag regions (`data-tauri-drag-region`), untried without a Mac; on Linux the page's bar sits below the window manager's, unchecked; Windows builds that refuse `DWMWA_CAPTION_COLOR` get the system-caption fallback (src-tauri/src/caption.rs), which no machine has shown yet and which ignores "Show accent color on title bars".
- [ ] `[pattern]` The first phone screen as a shell with widget and golden tests. Then the remaining phone screens, following it.
- [ ] The gateway's user site and admin site as shells on two ports, built from the shared components (UI design note, section 8).
- [ ] Device faces: the cue set on a small screen and on LEDs, shown in `web/stage`.

## Spikes

- [ ] Trust design (sign-in, enrollment, credentials, the vault, sealed accounts), before Stage 2.
- [ ] Provider cache (how DeepSeek's prefix cache behaves through the proxy, for forks, and across sessions; whether tool-call arguments stream; whether one response can carry several tool calls), before Stage 3.
- [ ] Mobile toolchain (agents building the Flutter iOS and Android toolchains with the Rust core; [client-stack-decision](memory/client-stack-decision.md) depends on it), before Stage 7.
- [ ] Transport (iroh against WebRTC with str0m or webrtc-rs), before Stage 8.
- [ ] Voice latency, at the start of V1.
- [ ] Device harness, at the start of V2, on the board chosen then.

## Later, by stage

- [ ] Stages 3 and 4: settle the open points in [memory/distributed-design.md](memory/distributed-design.md) in those stages' design notes.
- [ ] V2 (device track): generate the device faces' Rust constants from design/tokens.json during the firmware build ([UI design](../docs/design/ui.md), section 11; [generated-files](memory/generated-files.md)).
- [ ] Stage 6: choose the avatar formats with the user (P8). If Live2D is among them, settle the Live2D Expandable Application license terms first ([live2d-asset-packs](memory/live2d-asset-packs.md)).
- [ ] Stage 7: configure an Android release keystore (release builds are signed with the debug key) and decide how iOS builds are signed and published (CI only checks that iOS compiles).
- [ ] Stage 9, or earlier if users ask: code-sign the Windows and macOS desktop installers and set up the Tauri updater (needs a signing key pair).
