# TODO

Outstanding work. Stages, exit criteria, spikes, and budgets are in [plan/roadmap.md](plan/roadmap.md); the rules every item must respect are in [memory/architecture-invariants.md](memory/architecture-invariants.md). Slices marked `[pattern]` set the example later work copies, so they need the strongest model available or a close review.

## Waiting for the user

- [ ] Rule on the nine decisions listed in the roadmap under "Decisions waiting for the user". The defaults apply meanwhile.
- [ ] Merge NaiLongMeow/NL#1, then NaiLongMeow/NL#2 (rebase the second onto main if the first is squash-merged), then the branch that carries the direction records.
- [ ] Say which ESP32 board is available for Spike H and Stage 3.
- [ ] Supply a Code of Conduct reporting email to replace `[reporting address to be announced]` in CODE_OF_CONDUCT.md and `[举报邮箱待公布]` in CODE_OF_CONDUCT.zh-CN.md. The user chose to supply it later (2026-11-16).

## Stage 0: Ground

- [ ] Bring docs/architecture.md in line with architecture-invariants once the waiting decisions are settled (host and body vocabulary, S1, S7, T1, T3, E4, P8), and add its English version if decision 9 stands. In the same change, correct the design sections of README.md and README.zh-CN.md: they say API keys stay in the gateway (T3 adds the local vault) and that a relaying gateway cannot read the conversation, which is true of the relay but omits that the model proxy sees model requests in transit (T1).
- [ ] Remove leftovers of the abandoned Flutter-desktop design: the header comment in apps/client/lib/main.dart and the description in apps/client/pubspec.yaml still call the Flutter app the desktop main app.
- [ ] `[pattern]` Write the Stage 1 design note under `docs/design/`: protocol conventions (layers, identifiers, time, errors, limits, versioning), the attach and turn messages, event-log records, same-machine attachment, and the slice list below, revised as needed.

## Stage 1: Talk

In order. Each is one pull request with its tests.

- [ ] `[pattern]` Protocol messages for attaching and for turns, with codec tests that include unknown-field tolerance.
- [ ] `[pattern]` The turn engine as a state machine without I/O, with the scripted fake model and interruption tests.
- [ ] `[pattern]` The event log on SQLite: append, replay, and the first migration test.
- [ ] Language-model adapters (OpenAI-compatible, Anthropic), tested against recorded fixtures.
- [ ] The local vault behind an interface, with an in-memory fake and a write-only test.
- [ ] `[pattern]` Same-machine attachment, headless `nl-node`, and the command-line client with an end-to-end test.
- [ ] Memory v0: the rolling summary and the notes document with provenance.
- [ ] `[pattern]` Embed the node in the Tauri backend; chat in the main window over protocol frames; settings; English and zh-CN text.
- [ ] Pet cues, and the original placeholder character with its low-fidelity rendition.
- [ ] Tray and autostart with the official Tauri plugins. Verify the pet window's transparency, dragging, and double-click close on macOS and Linux (Windows 10 was checked by hand; on Linux only window creation and bottom-right placement were checked, on Ubuntu 24.04 under Xvfb without a compositor, so transparency could not be judged). Then implement per-pixel click-through.
- [ ] Release: the manual checklist on three systems, budgets measured, docs updated.

## Spikes

- [ ] Spike H (device audio), before Stage 3. Start as soon as a board is available.
- [ ] Spike P (pairing and trust design), before Stage 3.
- [ ] Spike V (voice latency), at the start of Stage 2.
- [ ] Spike T (transport: iroh against WebRTC with str0m or webrtc-rs and a TURN server), before Stage 5.
- [ ] Spike M (agents building the Flutter iOS and Android toolchains with the Rust core; [client-stack-decision](memory/client-stack-decision.md) depends on it), before Stage 6.

## Later, by stage

- [ ] Stage 4: settle the Live2D Expandable Application license terms before shipping Live2D support ([live2d-asset-packs](memory/live2d-asset-packs.md)), and choose the open 3D format offered beside the sprite baseline.
- [ ] Stage 6: configure an Android release keystore (release builds are signed with the debug key) and decide how iOS builds are signed and published (CI only checks that iOS compiles).
- [ ] Stage 8, or earlier if users ask: code-sign the Windows and macOS desktop installers and set up the Tauri updater (needs a signing key pair).
