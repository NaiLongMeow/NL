# TODO

Open items from the architecture design in [docs/architecture.md](../docs/architecture.md#待定事项).

- [ ] Choose the default open avatar format (VRM is the leading candidate; Live2D stays an optional pack, see [live2d-asset-packs](memory/live2d-asset-packs.md)).
- [ ] Evaluate iroh against WebRTC (str0m or webrtc-rs with coturn) for node-to-node transport.
- [ ] Build a minimal Flutter demo to check that agents can set up and build the iOS toolchain without stalling ([client-stack-decision](memory/client-stack-decision.md) depends on it).
- [ ] Settle the Live2D Expandable Application license terms before shipping Live2D support.
- [ ] Configure an Android release keystore (release builds are signed with the debug key) and decide how iOS builds are signed and published (CI only checks that iOS compiles).
- [ ] Verify the desktop pet window's transparency, dragging, and double-click close on macOS and Linux. Windows 10 was checked by hand; on Linux only window creation and bottom-right placement were checked (Ubuntu 24.04 under Xvfb, no compositor, so transparency could not be judged). Then implement per-pixel click-through.
- [ ] Embed nl-node in the Tauri backend of apps/desktop and add tray and autostart (official Tauri plugins).
- [ ] Code-sign the Windows and macOS desktop installers and set up the Tauri updater (needs a signing key pair).
- [ ] Replace the `[reporting address to be announced]` placeholder in CODE_OF_CONDUCT.md and `[举报邮箱待公布]` in CODE_OF_CONDUCT.zh-CN.md with a Code of Conduct reporting email; the user chose to supply it later (2026-11-16).
- [ ] Decide whether docs/ gets English versions; README, CONTRIBUTING, and SECURITY are English-first with zh-CN translations, but docs/architecture.md is Chinese only.
