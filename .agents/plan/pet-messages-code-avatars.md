# Plan: pet menu, background messages, code avatars

**Status:** in progress since 2026-11-19. Delete this file when the work is done and its decisions are in memory, the UI design note, and docs.

## What the user asked (2026-11-19)

> 额外功能补充：对于message工具调用，桌面端和移动端有额外逻辑，即是否在前台，如果桌面端焦点不在软件上，则message工具额外触发宠物气泡，移动端也一样，在宠物气泡显示；如果没有开启宠物常驻，移动端则是没有开启悬浮窗宠物，则走通知，注意：默认启用通知，用户可关闭（或许不想被打扰），注意桌面端和移动端都是有通知功能的，用各自系统的通知接口。额外补充：当前宠物应该是代码矢量渲染的，所以给用户也多种导入方法：1.代码导入，最自由，本质是注入代码，理论上可以涵盖代码矢量图形、图片播放、live2d或更多，因为代码是最高自由度的 2.标准宠物格式导入，本质是一些透明背景的位图集合，播放为动画，也支持gif文件 3.live2d。后两者为预设方便导入的，实际上第一种理论上可以上位替代后两者。性能要求：优化渲染，避免出现现在这种卡死的情况，用更好的渲染方式，避免一直频繁重载，可以试试局部重载，避免性能浪费

> 从双击关闭，改成右键显示菜单，菜单中有关闭。双击容易误触，但是可以当成其他宠物功能的快捷键，这个功能不能是破坏性的避免误触，主要作为娱乐性功能

Asked whether code avatars run sandboxed or with full access, the user chose **sandboxed** (2026-11-19): code runs in an isolated frame, may draw anything and react to cues, and cannot reach NL's interfaces or the network. This relaxes T8 for avatars (reserved decision 9, decided by the user).

The freeze the user saw (2026-11-19) came from the ball's animated HTML layers inheriting the title bar's `app-region`; fixed in b41e73f, and the ball and loaders now animate on the compositor (0a0373a).

## Agent's choices (proposals; the user reviews them)

- **Pet menu** (right click, native menu built in Rust from labels the pet sends): Open NL, Settings, Hide the pet, Quit NL. Hiding the pet while the main window is hidden shows the main window, so the app never becomes invisible.
- **Lifecycle:** closing the main window hides it while the pet is shown (the pet's menu opens it again) and quits NL otherwise; closing the pet hides it. Settings > Desktop pet gets "Show the desktop pet", saved in the pet prefs (`shown`, default on); the main window shows or hides the pet at start.
- **Double click:** a happy bounce, never anything that changes state: the ball jumps with ^ ^ eyes, cheeks, and a sparkle; an avatar pack plays its `bounce` gesture with the `happy` expression.
- **Background messages (desktop):** a message that arrives while the main window is not focused shows as a bubble beside the pet when the pet is shown; otherwise as a system notification (tauri-plugin-notification), if notifications are on (Settings, on by default). Only this device's sessions and shared sessions count. Phone: the same with the floating pet (Android overlay) or the system's notifications; designed now (UI design note 4.14), built with the phone shell, which is a TODO item.
- **Code avatars:** a third rendition, `code`: an HTML entry file and its scripts, styles, images, and WebAssembly, run in an iframe with `sandbox="allow-scripts"` (opaque origin: no storage, no access to the pet page or Tauri's IPC) and a content-security policy served with every pack file that allows only the pack's own files (no network). The pet page lays a transparent layer over the frame that keeps dragging, the menu, and double click, and sends the avatar cues by postMessage: state, expression, gesture, pointer, and where the pointer is. Code avatars are listed in light mode; their cost depends on their code. The pet page's own script-src narrows to the Live2D runtime's folder, since packs may now hold scripts.

## Steps

1. [x] Pet: right-click menu, double-click bounce, show/hide lifecycle and the Settings switch; tests; check in the app.
2. [x] Check the pet for renderers mounted again without need: none found (PackView mounts again only when the look's kind or key changes).
3. [x] Background messages: focus tracking in the main window, pet bubbles, desktop notifications with the Settings switch, i18n, tests; UI design note (sections 4, 6, 7, 13, 14).
4. [ ] Code avatars: format (format.ts, format.md, rules.json, SKILL.md), nl-assets, nlavatar CSP and content types, web/stage `mountCode`, pet integration, Settings tag, docs/avatars, T8 and avatar-packs memory; sandbox escape tests in the real app.
5. [ ] Records, checks, commits, push, CI; report to the user.
