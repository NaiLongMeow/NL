# Roadmap

The long-term order of work for NL. Written 2026-11-16, when the repository held only project skeletons, CI, and the release pipeline, and NaiLongMeow/NL#1 (scaffold) and NaiLongMeow/NL#2 (community docs) were open and unmerged.

**Main line, current stage: 0 (Ground). Voice and device track: not started.**

**How sessions and memory stay in step across nodes is under discussion in [distributed-design.md](distributed-design.md).** The user calls it the core feature. Stages 5 to 8 below, and rules S1 and S4, will be revised when it settles.

Read [product-direction](../memory/product-direction.md) and [architecture-invariants](../memory/architecture-invariants.md) first. Rule ids such as S1 and T3 refer to the invariants; "product rule 3" refers to the product direction. Outstanding tasks are in [TODO.md](../TODO.md).

## The order, and who set it

The user set the order on 2026-11-16, correcting a first draft that had it the other way round:

1. **All UI design comes first.** It fixes what the product is before any backend exists, and every later stage fills in behind a screen that already exists.
2. **The gateway is implemented first.** It is the login system that unifies every end, so nothing else can be finished without it.
3. **Then features, easiest and most certain first.** Text chat, then tools through MCP, then long-term memory. None of them needs special hardware.
4. **Then several ends:** the relay, the phone, and direct routes.
5. **Voice and the ESP32 depend on hardware, so they are a separate track** that never blocks the main line. The specific board is chosen when that track starts.

When re-planning, keep this logic: sequence by dependency and ease, not by novelty or risk, and never let hardware gate the main line.

## How to use this file

- Work only inside the **Build** list of the current stage. Anything under **Not yet**, in a later stage, or under "Parked ideas" waits, however convenient it looks. When a slice needs something from later, add a seam (an interface and a fake) and stop there (E9).
- If the user gives a task directly, do that task. If it conflicts with the current stage or an invariant, say so before starting.
- A stage is finished when every exit criterion has been demonstrated, the docs are true, and a release is tagged. Then tick the criteria, move "current stage" forward, and clear the finished items from TODO.md.
- No main-line exit criterion may depend on the voice and device track. Where a main-line feature would use voice or a device, it ships without them and gains them when the track arrives.

## Working method

The project is planned by the strongest model available and built mostly by cheaper ones. Three habits keep that working.

1. **A design note opens each stage.** Before a stage's first code, a short note under `docs/design/` (`NNNN-short-title.md`, in English) fixes the protocol and API additions, data formats, security impact, test plan, and the ordered slices. The user approves it. Writing it is planning work for the strongest model available, and it is where reserved decisions get made.
2. **Pattern first, then follow.** The first implementation of each recurring pattern (a screen on fake data, a gateway endpoint with its storage and tests, a protocol service, a state machine with its fake, a migration, a provider adapter) becomes the example every later change copies, so it is written or closely reviewed by the strongest model available. TODO.md marks these slices `[pattern]`. Later slices follow the nearest pattern instead of inventing a new shape.
3. **Spikes answer questions; they do not ship code.** A spike is a time-boxed experiment on a `spike/*` branch that is never merged. Its result is a decision recorded in memory with its evidence, and the stage it gates starts from that decision.

When the same obstacle survives a real diagnosis and a second approach, stop and report what was tried and what was observed. Never get past an obstacle by weakening a rule, a test, or a budget.

## Main line

Each stage ends in something a person can use and CI can check. Nothing here needs special hardware.

### Stage 0: Ground

**Goal:** main holds the scaffold, the community docs, and this direction, and the docs agree with the direction.

**Build:**
- The user merges NaiLongMeow/NL#1, then NaiLongMeow/NL#2, then the branch that carries this direction.
- docs/architecture.md and the READMEs are brought in line with the invariants.
- Leftovers of the abandoned Flutter-desktop design are removed.

**Exit:**
- [ ] main contains the scaffold, the community docs, and the direction, with `CI OK` green.
- [ ] docs/architecture.md and the READMEs agree with the invariants.

### Stage 1: Design (the UI of every end)

**Goal:** Every screen NL will have exists and can be clicked through on fake data, in English and Simplified Chinese, under one design language. From here on, each stage fills in real behaviour behind screens that already exist.

**Build:**
- A UI design note, approved by the user: who uses what, and the flows and screens of every end.
  - Desktop main window: sign-in and first run, chat, the character view, memory, character packs, tools, bodies, usage and limits, settings.
  - Desktop pet: its cue states, menu, and interactions (dragging, click-through, tray, autostart).
  - Phone: sign-in, chat, call screen, notifications, device setup, settings.
  - Gateway pages: sign-in, and the account, nodes, keys, and usage screens, wherever the note places them (in the apps, in a web console, or both).
  - Device faces: how the cue set looks on a small screen and on LEDs.
- One design language from a single token source (color, type, spacing, motion) that the web UIs and the Flutter app both build from ([client-stack-decision](../memory/client-stack-decision.md)).
- The cue vocabulary (P8) and an original placeholder character with its low-fidelity rendition (product rule 9).
- Every screen implemented as a shell. A screen reads from and acts on an interface with a fake behind it (E2), so that a later stage replaces the fake with the real session or gateway call without rewriting the screen. Screens are localizable from the start (product rule 10) and have tests that run headless.
- The needs list: what the screens require from the protocol and the gateway. It feeds the design notes of the following stages.

**Not yet:** real sign-in, real model calls, any backend behaviour; visual polish beyond the design language. Voice and device screens are designed and built as shells here, but their behaviour belongs to the voice and device track.

**Exit:**
- [ ] The user has approved the UI design note.
- [ ] Every screen in the note exists as a shell on fake data, in both languages.
- [ ] The design tokens come from one source, and both UI code bases build from it.
- [ ] UI tests run headless in CI; the pet window's transparency, dragging, and click-through are checked by hand on Windows, macOS, and Linux, and recorded.
- [ ] The needs list is written.

### Stage 2: Gateway (the login system)

**Goal:** A person creates an account on a gateway, signs in from the desktop app, sees their nodes, and stores a model key that can be used but never read back.

**Build:**
- The sign-in and enrollment design, approved before any of it is coded (reserved decision 1; spike "trust design", part one).
- Accounts and sign-in for people; enrollment of nodes (desktop, phone, server, and devices by pairing code); the node registry with presence (T2).
- The vault and the model proxy (T3), borrowing from mature API gateways such as sub2api where their design fits ([reference-designs](../memory/reference-designs.md)). Keys are encrypted at rest. The proxy adds the key and enforces limits (E7); provider-specific logic stays in the node's adapters (E5), so the gateway does not grow a second provider layer.
- The gateway's HTTP API specified in the repository, with tests (P1). PostgreSQL and Redis (E4), with a compose file for development and disposable service containers in CI.
- The sign-in, account, nodes, keys, and usage screens from Stage 1 wired to the real gateway.
- A container image, configuration, and a self-hosting guide.

**Not yet:** the relay and rendezvous (Stage 6), push (Stage 7), operator features for a public service.

**Exit:**
- [ ] Sign-up, sign-in, and node enrollment work from the desktop app and from a command-line client.
- [ ] A stored key cannot be read back through any interface, and neither keys nor request content appear in default logs (automated).
- [ ] A model request sent through the proxy with a test node's credential reaches a fake provider with the key attached, and is refused beyond the configured limit (automated).
- [ ] Revoking a node cuts its access at once (automated).
- [ ] The gateway with PostgreSQL and Redis runs within the small-server budget.

### Stage 3: Talk (text chat on the desktop)

**Goal:** A signed-in person chats with the character in the main window while the pet reacts. The history survives a restart.

**Build:**
- Protocol basics: attaching a body to a host, and the turn (user text in; streamed text, cues, tool activity, end, and errors out; cancel).
- The turn engine in the host: event-driven and interruptible (E1, P7), able to call tools from the start, with only built-in tools for now.
- The language-model interface with its DeepSeek adapter, which reaches the provider through the gateway's proxy, and a scripted fake (E2, E5).
- Sessions as JSONL files with replay and a tested format-upgrade path (S2, S5, S6), and a rolling summary that bounds the context.
- Same-machine attachment: an authenticated channel carrying protocol frames (P2, T5), `nl-node` running headless, and a command-line client used by end-to-end tests.
- The node embedded in the Tauri backend; the chat, character, and pet screens wired through the protocol.

**Not yet:** MCP and long-term memory (the next two stages), sessions between machines, the phone, voice.

**Exit:**
- [ ] A fresh install on Windows, macOS, and Linux reaches a streamed reply after sign-in (manual checklist recorded with the release).
- [ ] It works against the real DeepSeek API through the gateway (manual, recorded).
- [ ] After a restart the history is intact (automated, scripted model).
- [ ] The command-line client holds a conversation with a headless `nl-node` signed in to a test gateway (automated, end to end).
- [ ] Stopping a streaming reply takes effect within the interrupt budget (automated).
- [ ] No conversation text appears in the default logs of the node or the gateway (automated).
- [ ] The desktop idle budgets are measured and met.

### Stage 4: Extend (tools and routines)

**Goal:** The character can use tools the user adds, can act on a schedule, and outside agents can speak through it.

**Build:**
- Tools through MCP on the host, under a permission policy (T7), with tool output marked untrusted (T6, T10). The tools screen wired.
- Whether and how local tool processes are confined, settled in this stage's design note. The permission policy is required either way. The candidates are what agent harnesses already use: operating-system sandboxing on a desktop and containers on a server (T8).
- Routines as data: an event or a schedule leads to a prompt, within limits the user sets (E7).
- The host as an MCP server, so that outside agents can speak through the character.
- Background sub-agents for slow work (product rule 3).

**Not yet:** a registry or marketplace; third-party code loaded into the node process; device affordances, which arrive with devices on the voice and device track.

**Exit:**
- [ ] A third-party MCP server works end to end, with the policy enforced in tests.
- [ ] An injection test suite (hostile tool output, pack text, web content) cannot trigger a protected action.
- [ ] A routine fires on schedule and stops at its limit (automated, fake clock).

### Stage 5: Remember (long-term memory and identity)

**Goal:** Over weeks the character comes to know the user, and it has an identity of its own.

**Build:**
- Memory: durable facts and episodes extracted with provenance (T10), offered to the character as tools on Stage 4's machinery, with retrieval over derived indexes (S2), consolidation in the background within a budget (E7), and newer facts superseding older ones without erasing history.
- The memory screen wired: view, edit, delete, export (S6).
- Character packs: persona, voice settings, and the mandatory low-fidelity rendition, imported through the validation in `nl-assets` (T8). Richer renditions behind the cue interface come after it: an open 3D format first, then Live2D through runtime packs.
- Proactive contact with quiet hours, a frequency limit, and a spending limit (product rule 4, E7).
- A small, inspectable relationship state, for example mood and familiarity.

**Not yet:** sharing or a marketplace for packs, several characters in one home, telling speakers apart.

**Exit:**
- [ ] A fixed set of recall scenarios passes (a scripted model for the mechanics, a documented live checklist for quality).
- [ ] Deleting a memory removes it from every index and from exports.
- [ ] The injection test suite cannot plant an unlabeled memory.
- [ ] Importing a pack changes persona and avatar on every attached body.
- [ ] Proactive contact respects quiet hours and both limits in tests.

### Stage 6: Unify (several ends, one character)

**Goal:** The same account on a second machine joins the same character. The host can run on a server. Ends on different networks reach each other through the gateway's relay, which cannot read what it carries.

**Build:**
- The session design between nodes, approved (spike "trust design", part two): keys, mutual authentication against the gateway's registry, end-to-end encryption (T2).
- The gateway's relay role (T1). The relay is built first because it works on every network and both ends already hold a connection to the gateway. Direct routes arrive in Stage 8 and are preferred at run time from then on; "direct first, relay last" describes what a running system chooses, not the order of construction.
- Sessions that run unchanged over any channel (E1), so that a relayed channel can later be swapped for a direct one.
- A headless host on a server, and host handover between a desktop and a server (S1).
- Several bodies attached to one host show the same conversation live (product rule 1). The bodies screen wired.

**Not yet:** direct routes and NAT traversal (Stage 8), the phone (Stage 7).

**Exit:**
- [ ] Two machines on different networks hold one conversation through the relay (automated with two processes and a test gateway, confirmed by hand once).
- [ ] A test shows that the relay cannot read a relayed session.
- [ ] A handover between a desktop and a server keeps the full history, and bodies refuse the old host.
- [ ] The gateway, PostgreSQL, Redis, and one node run together within the small-server budget.

### Stage 7: Pocket (the phone)

**Goal:** The character is in the user's pocket: sign in and chat on Android and iOS, and receive a nudge when the character has something to say.

**Build:**
- The Rust core inside the Flutter app, as a body and never a host (S4). The phone screens from Stage 1 wired: sign-in and enrollment, chat, the avatar through `web/stage`, settings.
- The gateway's push role. A push is a content-free wake-up: the payload carries no conversation text (T1). One delivery path must work without Google services (E6).

**Gate:** the spike "mobile toolchain" passes, and the user has the developer accounts the platforms require.

**Not yet:** voice, the call screen, and device setup on the phone, which arrive with the voice and device track.

**Exit:**
- [ ] Both platforms sign in, enroll, and chat through the relay.
- [ ] A proactive message reaches a backgrounded phone on both platforms.
- [ ] Push payloads contain no plaintext content (automated).
- [ ] How the apps are distributed (stores, sideloading) is decided and documented.

### Stage 8: Direct (direct routes first)

**Goal:** Ends talk directly whenever the network allows and fall back to the relay only when it does not.

**Build:**
- The transport chosen by the spike "transport", and the gateway's rendezvous role.
- The ladder in docs/architecture.md, one rung at a time: LAN, public address, port mapping, hole punching. The relay stays as the last rung.

**Exit:**
- [ ] Tests in a simulated NAT environment cover every rung, and each failure falls through to the next rung and finally to the relay.
- [ ] Two ends on one LAN connect directly, and a session survives moving from a direct route to the relay.

### Stage 9: Harden (1.0)

**Build:**
- Freeze the protocol and the gateway API (P4 then allows additive changes only) and publish the conformance suite.
- An outside security review of T1 to T4 and of the pack and tool surface.
- Upgrade tests from every released data format (S6).
- Signed installers, with an updater.
- Documentation for users, self-hosters, and authors of other ends.
- Guidance for operators on their legal duties, with the product hooks they need: AI disclosure, usage reminders, a minors' mode, exit, data export and deletion.

**Exit:**
- [ ] Every item above is done and 1.0 is tagged.

1.0 does not wait for the voice and device track. Whatever part of that track is finished is included; the constrained profile is frozen only if V2 is done.

## Voice and device track

This track depends on hardware. It runs beside the main line whenever hardware and the user's time allow. Each step names what it needs from the main line; the main line needs nothing from it.

### V1: Speak (voice on the desktop). Needs Stage 3.

**Goal:** The user talks to the pet, hears it answer, and can cut it off mid-sentence.

**Build:**
- The spike "voice latency" first.
- Streaming speech-recognition and speech-synthesis interfaces, each with its DeepSeek adapter reached through the gateway's proxy, and a fake fed by audio fixtures (E2, E5).
- The audio turn, streaming end to end: capture, end-of-speech detection, recognition, the turn engine, synthesis, playback. Barge-in cancels speech in progress (P7).
- Audio streams in the protocol (Opus voice audio in a compact framing, P6). The desktop microphone and speaker are the first audio body and use these streams as any other body would (P2).
- Push-to-talk and a hotkey first; a desktop wake word is optional.
- Cues for listening and speaking, including a mouth-movement level derived from the audio.

**Exit:**
- [ ] The voice round-trip and interrupt budgets are measured and met on the reference setup.
- [ ] All host-side audio logic is tested in CI with fixtures.

### V2: Embody (an ESP32 as a body). Needs V1 and Stage 6.

**Goal:** The user speaks to an ESP32 device and the character answers through it, while the desktop pet reacts as the same character.

**Build:**
- The board is chosen when this step starts (user decision, 2026-11-16). The spike "device audio" runs first on that board.
- The device enrolls at the gateway with a pairing code and reaches its host through the relay, speaking the constrained profile (P6) over WebSocket, the single transport for constrained nodes.
- The virtual body first (E2), with conformance tests that any firmware can be run against.
- Firmware as a thin shell (E1): Wi-Fi provisioning, enrollment, wake word, capture and playback, Opus, cues on an LED or a screen, signed updates with rollback (T8). Full-duplex voice with barge-in on boards that have an echo reference; push-to-talk or half-duplex on the others (P3).
- Several bodies at once: one voice at a time, with the host choosing (product rule 2).
- Device affordances: a body declares typed properties, commands, and events with safe ranges, and the host offers them to the model as tools under Stage 4's policy (T7).
- The device setup and call screens wired, on the desktop and, if Stage 7 is done, on the phone.
- The lifeline (P5) starts with the first release that ships firmware.

**Exit:**
- [ ] The virtual body passes the conformance tests in CI.
- [ ] On the chosen board the manual checklist passes and is recorded: provision, enroll, wake, converse, interrupt, update, roll back, recover from power loss and from losing Wi-Fi or the host.
- [ ] With two bodies in one room, exactly one answers (automated with virtual bodies, confirmed by hand once).
- [ ] The device budgets are measured and met.
- [ ] A flashable image is part of the release, and the lifeline is declared in the protocol docs.

### V3: Near (devices on the LAN). Needs V2 and Stage 8.

**Goal:** A device and a host on the same network talk directly, and fall back to the relay when they are apart.

**Build:** LAN discovery and direct sessions for constrained nodes; a host with a public address serving a device directly.

**Exit:**
- [ ] A device and a host on one LAN meet the direct voice budget, and the device falls back to the relay when the host leaves the LAN.

## Spikes

| Spike | Question | Finish before | Pass when | If it fails |
|---|---|---|---|---|
| Trust design, part one | A design, not code: how people sign in; how a desktop, a phone, a server, and a device enroll and are revoked; what each credential allows; how keys are stored in the vault (T1 to T4) | Stage 2 | The user approves the note. The strongest model available writes it; get an outside review if one can be had | Stage 2 does not start without it |
| Trust design, part two | A design, not code: how two nodes key and authenticate an end-to-end encrypted session, over the relay and over direct routes, including for a constrained node (T2) | Stage 6 | As above | Stage 6 does not start without it |
| Mobile toolchain | Can agents set up and build the Flutter iOS and Android toolchains with the Rust core without stalling ([client-stack-decision](../memory/client-stack-decision.md))? | Stage 7 | A minimal app with the Rust core builds for both platforms from the command line in CI | Revisit the mobile stack with the user |
| Transport | Which library carries direct sessions between full nodes with NAT traversal: iroh first, WebRTC (str0m or webrtc-rs) second | Stage 8 | Discovery and fallback need no third-party infrastructure (E6); it builds and connects on Android and iOS; it works on a mainland China network; the binary size is acceptable | WebRTC data channels with a self-hosted TURN server; as a last resort, phones stay on the relay |
| Voice latency | Does a streaming chain of recognition, model, and synthesis on the host meet the round-trip budget with DeepSeek's APIs? | Start of V1 | The budget is met | Fix end-of-speech detection first; then consider another speech provider or a speech-to-speech backend |
| Device audio | Can Rust on ESP-IDF run wake word and echo cancellation (ESP-SR), Opus, Wi-Fi, and an encrypted session together on the chosen board, inside the device budgets? | Start of V2 | Thirty minutes of two-way audio with a host program without a reset; the wake word triggers reliably; the memory budget holds | Keep ESP-SR and the codec in a small C component behind a handful of functions called from Rust. If Rust itself is the obstacle, write the firmware shell in C or C++ against the same protocol, which P1 makes legitimate |

## Initial budgets

| Budget | Starting target |
|---|---|
| First reaction (a cue) after user input ends | 300 ms |
| Interrupt, user stops the reply or starts speaking to output stopped | 300 ms |
| Desktop, pet visible and idle | Under 3% of one CPU core and 300 MB of RAM in total; rendering pauses when the pet is hidden or a full-screen app is in front |
| Small server | The gateway with PostgreSQL and Redis, plus one node, on 1 vCPU and 2 GB of RAM; an idle node under 150 MB |
| Money | Proactive contact, routines, consolidation, and sub-agents stop at a daily limit the user sets; the defaults are low |
| Voice round trip, end of speech to first audio | 1.5 s on a direct route; 2.5 s through the relay |
| Voice on the network | 32 kbit/s in each direction |
| ESP32 device (the chosen board) | The image fits its update slot with 20% to spare; 64 KB of internal RAM stays free during a voice session; it reconnects by itself after losing Wi-Fi or the host; it survives power loss during an update |

These numbers are starting targets set without measurement. Replace each with a measured one in the stage that first exercises it. Change a budget only by an explicit decision, never by letting it slip.

## Risks and tripwires

| Risk | Early sign | Response |
|---|---|---|
| Screens drift from what the backend can do | A stage needs a screen the design lacks, or a screen needs data no stage provides | Change the UI design note first, then the screen; the note stays the source of truth |
| The gateway is a single point of failure and of trust | An outage stops every end; docs or UI say the gateway can see nothing | Keep the gateway small and restartable, document backups, state T1 plainly, keep self-hosting first-class |
| The protocol or the gateway API churns after ends are in people's hands | A change needs the breaking-change label after a release | Stop and route it through a design note (reserved decision 2); protect the lifeline |
| Agents over-build | A pull request adds configuration, abstractions, or features outside the stage's Build list | Cut it back to the slice (E9) |
| Tools and outside content attack the user | An MCP server's output steers the character; demand for a marketplace | T6, T7, T10 and the injection suite; keep the non-goal |
| Memory goes wrong: false, stale, or planted facts | Recall scenarios fail; a memory lacks provenance | Keep the log canonical (S2), provenance mandatory (T10), and the user able to edit |
| Costs run away | A loop without a limit; spending not visible | E7: no autonomous loop without a limit and a stop condition |
| The review queue outgrows one maintainer | Large or mixed pull requests | Small slices, strong CI, pattern-following, design notes up front |
| A key library is abandoned (the transport, the Rust-Flutter bridge, Tauri, the esp-idf crates) | No releases for a year, or it breaks with a new toolchain | E1 and P1 keep the logic independent; replace the shell around it |
| Phones resist: background limits, push without Google services, store rules, signing costs | The spike "mobile toolchain" stalls | The desktop does not depend on the phone; keep the phone a body only |
| A dependency or service is unreachable from mainland China | A feature works with only one region's service | E6: make the endpoint configurable or choose another |
| Voice feels slow, or device audio in Rust proves fragile | A voice-track spike misses its pass criteria | Take that spike's fallback; the main line is unaffected |
| Legal exposure | Plans for a public gateway; assets that resemble an existing character | Product rules 4 to 6 and 9; check the law before operating anything public |

## Decisions waiting for the user

The default applies until the user says otherwise.

1. **Who runs gateways.** The gateway is required, so every user needs one to sign in to: their own, or one somebody runs for them. Default: the project ships the software and runs no public gateway. A public companion service in China falls under CAC Order No. 21 (see product-direction, "Legal context").
2. **Avatar baseline (P8).** Default: every pack carries a low-fidelity sprite rendition; an open 3D format and Live2D are optional extras. docs/architecture.md names VRM as the candidate default; VRM describes humanoid 3D models, which suits neither a mascot-shaped character nor a small device screen.
3. **Mainland China reachability as a hard requirement (E6).** Inferred from the maintainer's environment, not stated by the user.
4. **The default character.** Who creates the original art and voice, and whether the project name's allusion to 奶龙 should stay (product rule 9).
5. **Language of docs/.** Default: design notes in English only; docs/architecture.md gets an English version as the canonical one with a zh-CN translation, like the other human docs ([docs-languages](../memory/docs-languages.md)).

## Parked ideas

None of these is planned. Each needs the user's go-ahead.

- An adapter that lets devices running other open voice-assistant firmware (for example xiaozhi-esp32) act as bodies, to reach hardware people already own. Its protocol and license have not been checked.
- A speech-to-speech model as an alternative voice backend.
- Local, offline models on a desktop host.
- A browser body built on `web/stage`.
- Sensor and actuator nodes without voice on RISC-V ESP32 chips (C3, C6), which do not need the Xtensa fork of the Rust toolchain.
- Telling household members apart by voice; several characters in one home.
- Automatic host failover.
