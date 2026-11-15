---
name: client-stack-decision
description: Recall before changing or questioning the mobile or desktop client stack (Flutter, Tauri, React Native, native, desktop pet process).
metadata:
  type: project
  scope: Mobile and desktop clients, including the desktop pet
  status: active
  last_verified: 2026-11-15
---

Mobile is Flutter with the Rust core bridged by flutter_rust_bridge v2. Desktop is three processes: an `nl-node` daemon, a Flutter main app that shares UI code with mobile, and a separate Rust desktop pet process built on tao + wry with a transparent webview. The layout itself is described in [docs/architecture.md](../../docs/architecture.md); this entry keeps what was rejected and why.

**Why:**
- React Native was rejected because the user observed agents stalling for a long time on its environment setup (see [[tech-choice-criteria]]).
- Tauri mobile was rejected because push (FCM/APNs) had no plugin, and BLE and background services had only community plugins, the background one not surviving app close on iOS.
- Pure native Kotlin + Swift was considered and lost to Flutter on custom, brand-styled UI rendered identically on both platforms and on golden tests that run headless on Linux. Native wins only on system styling such as iOS 26 Liquid Glass, which a companion app does not need.
- A Flutter-only desktop was rejected: its multi-window API was experimental and main-channel only (Flutter 3.44 to the 3.50 beta), it had no native per-pixel click-through, and on Windows and Linux an embedded webview floats above Flutter widgets, which breaks a webview-rendered avatar.
- A pure winit + wgpu pet was rejected for now: wgpu's default DX12 HWND swapchain is opaque, so transparency needs a DirectComposition path plus redirection-bitmap workarounds, and no mature Rust avatar renderer exists (inox2d-wgpu is a prototype).

**How to apply:** Keep the pet renderer behind an interface so a native wgpu renderer can replace the webview later. Do not move the pet into the Flutter app or add Flutter desktop windows for it.

**Evidence:** User decisions in conversation, 2026-11-15; web research the same day on Flutter 3.44 release notes, flutter/flutter#170310, tauri-plugin-blec, tauri-background-service, wgpu#3486, and inox2d-wgpu on crates.io.

**Recheck when:** Flutter ships stable multi-window and click-through; a Rust Live2D or VRM renderer matures; webview memory in the pet becomes a user complaint; or agents stall on Flutter's iOS toolchain (an open check in [TODO.md](../TODO.md)).
