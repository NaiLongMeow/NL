---
name: client-stack-decision
description: Recall before changing or questioning the mobile or desktop client stack (Flutter, Tauri, React Native, native, Flutter desktop, desktop pet).
metadata:
  type: project
  scope: Mobile and desktop clients, including the desktop pet
  status: active
  last_verified: 2026-11-18
---

Mobile is Flutter (apps/client, Android and iOS only) with the Rust core bridged by flutter_rust_bridge v2. Desktop is one Tauri 2 app (apps/desktop): a main window and a transparent desktop pet window, with nl-node to be embedded in the Tauri backend. Both render the character through web/stage. The layout is described in [docs/architecture.md](../../docs/architecture.md); this entry keeps what was rejected and why.

**Why:**
- React Native was rejected because the user observed agents stalling for a long time on its environment setup (see [[tech-choice-criteria]]).
- Tauri mobile was rejected because push (FCM/APNs) had no plugin, and BLE and background services had only community plugins, the background one not surviving app close on iOS.
- Pure native Kotlin + Swift lost to Flutter on custom, brand-styled UI rendered identically on both platforms and on golden tests that run headless on Linux.
- Flutter desktop was rejected for the main app: its multi-window API was experimental and main-channel only (Flutter 3.44 to the 3.50 beta), it had no native click-through, and on Windows and Linux an embedded webview floats above Flutter widgets, which breaks showing the webview-rendered character inside the main window. Tauri also keeps the Rust core in-process and has official tray, autostart, global-shortcut, and updater plugins.
- An intermediate design (Flutter main app + nl-node daemon + separate tao/wry pet process) was briefly scaffolded and replaced on 2026-11-15 when the user asked which framework is best for the whole desktop. The user's earlier "split the pet out" meant only isolating the pet from Flutter's limits, not choosing Flutter for the desktop main app.
- Two UI codebases (Flutter mobile, web desktop) were accepted because human maintenance cost is not a core factor here ([[tech-choice-criteria]]).

**How to apply:** Keep desktop UI in apps/desktop and mobile UI in apps/client (Flutter). The desktop windows and the gateway's two web sites use React with TypeScript, which the user approved on 2026-11-18 as the UI framework (reserved decision 5); share visuals through web/stage and a common design-token source rather than by merging the apps. Do not re-add Flutter desktop platforms to apps/client. The pet can become a separate process later if its memory footprint matters, but start from a Tauri window.

**Evidence:** User decisions in conversation, 2026-11-15, and the approval of React with TypeScript on 2026-11-18; web research the same day (Flutter 3.44 release notes, flutter/flutter#170310, tauri-plugin-blec, tauri-background-service); Tauri 2.12.5 pet window verified by hand the same day (transparent background, drag, double-click close) on the maintainer's machine, Windows 11 build 26300 (this record said Windows 10 until 2026-11-19).

**Recheck when:** Flutter ships stable multi-window and fixes webview layering on desktop; Tauri 3 leaves alpha; or agents stall on Flutter's iOS toolchain (an open check in [TODO.md](../TODO.md)).
