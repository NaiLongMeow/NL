# TODO

Open items from the architecture design in [docs/architecture.md](../docs/architecture.md#待定事项).

- [ ] Choose the default open avatar format (VRM is the leading candidate; Live2D stays an optional pack, see [live2d-asset-packs](memory/live2d-asset-packs.md)).
- [ ] Evaluate iroh against WebRTC (str0m or webrtc-rs with coturn) for node-to-node transport.
- [ ] Build a minimal Flutter demo to check that agents can set up and build the iOS toolchain without stalling ([client-stack-decision](memory/client-stack-decision.md) depends on it).
- [ ] Settle the Live2D Expandable Application license terms before shipping Live2D support.
- [ ] Enable branch protection on main in GitHub: require pull requests and the `CI OK` check from .github/workflows/ci.yml. AGENTS.md states the rule but nothing enforces it yet.
- [ ] Configure an Android release keystore (release builds are signed with the debug key) and decide how iOS builds are signed and published (CI only checks that iOS compiles).
- [ ] Verify the desktop pet window's transparency, dragging, and double-click close on macOS and Linux (only Windows 10 was checked by hand), and implement per-pixel click-through.
- [ ] Embed nl-node in the Tauri backend of apps/desktop and add tray and autostart (official Tauri plugins).
- [ ] Code-sign the Windows and macOS desktop installers and set up the Tauri updater (needs a signing key pair).
