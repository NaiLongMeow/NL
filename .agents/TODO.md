# TODO

Outstanding work. Stages, exit criteria, spikes, and budgets are in [plan/roadmap.md](plan/roadmap.md); the rules every item must respect are in [memory/architecture-invariants.md](memory/architecture-invariants.md). Slices marked `[pattern]` set the example later work copies, so they need the strongest model available or a close review. Each stage's design note produces that stage's slices; only the current and next stage are listed here.

## Waiting for the user

- [ ] Rule on the five decisions listed in the roadmap under "Decisions waiting for the user". The defaults apply meanwhile.
- [ ] Merge NaiLongMeow/NL#1, then NaiLongMeow/NL#2 (rebase the second onto main if the first is squash-merged), then the branch that carries the direction records.
- [ ] Supply a Code of Conduct reporting email to replace `[reporting address to be announced]` in CODE_OF_CONDUCT.md and `[举报邮箱待公布]` in CODE_OF_CONDUCT.zh-CN.md. The user chose to supply it later (2026-11-16).

## Stage 0: Ground

- [ ] Bring docs/architecture.md, README.md, and README.zh-CN.md in line with architecture-invariants, and add an English docs/architecture.md if decision 5 stands. What to correct:
  - use the host and body vocabulary, and state S1 (one host per character);
  - say plainly what the gateway can see (T1, T2): the relay carries only ciphertext, but the model proxy sees model requests in transit and the gateway decides which nodes belong to an account;
  - drop MQTT as a transport for the ESP32 (E4 makes a broker a reserved decision);
  - drop "扩展脚本走 MCP 或 WASM 沙箱": WASM was an unexamined assumption, and extensions are MCP servers outside the node process (T8);
  - replace VRM as the candidate default avatar format with the low-fidelity baseline, if decision 2 stands (P8).
- [ ] Remove leftovers of the abandoned Flutter-desktop design: the header comment in apps/client/lib/main.dart and the description in apps/client/pubspec.yaml still call the Flutter app the desktop main app.

## Stage 1: Design

- [ ] `[pattern]` Write the UI design note under `docs/design/`: who uses what, the flows and screens of every end (desktop main window, desktop pet, phone, gateway pages, device faces), and the needs list for the protocol and the gateway.
- [ ] `[pattern]` One design-token source (color, type, spacing, motion) that the web UIs and the Flutter app both build from.
- [ ] The cue vocabulary, and an original placeholder character with its low-fidelity rendition (who creates the art is decision 4).
- [ ] `[pattern]` The first desktop screen as a shell: an interface with a fake behind it, component tests, English and zh-CN text. Then the remaining main-window screens, following it.
- [ ] The pet window: cue states and menu; tray and autostart with the official Tauri plugins; per-pixel click-through. Verify transparency, dragging, and double-click close on macOS and Linux (Windows 10 was checked by hand; on Linux only window creation and bottom-right placement were checked, on Ubuntu 24.04 under Xvfb without a compositor, so transparency could not be judged).
- [ ] `[pattern]` The first phone screen as a shell with widget and golden tests. Then the remaining phone screens, following it.
- [ ] The gateway pages as shells, wherever the design note places them.
- [ ] Device faces: the cue set on a small screen and on LEDs, shown in `web/stage`.

## Spikes

- [ ] Trust design, part one (sign-in, enrollment, credentials, the vault), before Stage 2.
- [ ] Trust design, part two (end-to-end encrypted sessions between nodes), before Stage 6.
- [ ] Mobile toolchain (agents building the Flutter iOS and Android toolchains with the Rust core; [client-stack-decision](memory/client-stack-decision.md) depends on it), before Stage 7.
- [ ] Transport (iroh against WebRTC with str0m or webrtc-rs and a TURN server), before Stage 8.
- [ ] Voice latency, at the start of V1.
- [ ] Device audio, at the start of V2, on the board chosen then.

## Later, by stage

- [ ] Stage 5: settle the Live2D Expandable Application license terms before shipping Live2D support ([live2d-asset-packs](memory/live2d-asset-packs.md)), and choose the open 3D format offered beside the sprite baseline.
- [ ] Stage 7: configure an Android release keystore (release builds are signed with the debug key) and decide how iOS builds are signed and published (CI only checks that iOS compiles).
- [ ] Stage 9, or earlier if users ask: code-sign the Windows and macOS desktop installers and set up the Tauri updater (needs a signing key pair).
