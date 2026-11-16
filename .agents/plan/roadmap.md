# Roadmap

The long-term order of work for NL. Written 2026-11-16, when the repository held only project skeletons, CI, and the release pipeline, and NaiLongMeow/NL#1 (scaffold) and NaiLongMeow/NL#2 (community docs) were open and unmerged.

**Main line, current stage: 0 (Ground). Voice and device track: not started.**

Read [product-direction](../memory/product-direction.md), [architecture-invariants](../memory/architecture-invariants.md), and [distributed-design](../memory/distributed-design.md) first. Rule ids such as S2 and M4 refer to the invariants; "product rule 3" refers to the product direction. Outstanding tasks are in [TODO.md](../TODO.md).

## The order, and who set it

The user set the order on 2026-11-16, correcting a first draft that had it the other way round:

1. **All UI design comes first.** It fixes what the product is before any backend exists, and every later stage fills in behind a screen that already exists.
2. **The gateway is implemented first.** It is the login system that unifies every node, so nothing else can be finished without it.
3. **Then features that need no special hardware, easiest and most certain first.** Tools through MCP are easy, and long-term memory comes before voice.
4. **The distributed design is the core feature:** one character and one memory across nodes, and a conversation carried on from another node.
5. **Voice and the ESP32 depend on hardware, so they are a separate track** that never blocks the main line. The specific board is chosen when that track starts.

The agent placed the distributed core (Stage 4) ahead of tools (Stage 5) because the user called it the core feature; the user may swap the two. When re-planning, keep this logic: sequence by dependency and ease, not by novelty or risk, and never let hardware gate the main line.

## How to use this file

- Work only inside the **Build** list of the current stage. Anything under **Not yet**, in a later stage, or under "Parked ideas" waits, however convenient it looks. When a slice needs something from later, add a seam (an interface and a fake) and stop there (E9).
- If the user gives a task directly, do that task. If it conflicts with the current stage or an invariant, say so before starting.
- A stage is finished when every exit criterion has been demonstrated, the docs are true, and a release is tagged. Then tick the criteria, move "current stage" forward, and clear the finished items from TODO.md.
- No main-line exit criterion may depend on the voice and device track. Where a main-line feature would use voice or a device, it ships without them and gains them when the track arrives.
- The gateway grows with the stages. Stage 2 builds the login system, the vault, and the model proxy; each later stage adds the gateway service its feature needs.

## Working method

The project is planned by the strongest model available and built mostly by cheaper ones. Three habits keep that working.

1. **A design note opens each stage.** Before a stage's first code, a short note under `docs/design/` (`NNNN-short-title.md`, in English) fixes the contract additions, data formats, security impact, test plan, and the ordered slices. The user approves it. Writing it is planning work for the strongest model available, and it is where reserved decisions and the open points in distributed-design get settled.
2. **Pattern first, then follow.** The first implementation of each recurring pattern (a screen on fake data, a gateway endpoint with its storage and tests, a harness feature with its fake, a fork, a migration) becomes the example every later change copies, so it is written or closely reviewed by the strongest model available. TODO.md marks these slices `[pattern]`. Later slices follow the nearest pattern instead of inventing a new shape.
3. **Spikes answer questions; they do not ship code.** A spike is a time-boxed experiment on a `spike/*` branch that is never merged. Its result is a decision recorded in memory with its evidence, and the stage it gates starts from that decision.

When the same obstacle survives a real diagnosis and a second approach, stop and report what was tried and what was observed. Never get past an obstacle by weakening a rule, a test, or a budget.

## Main line

Each stage ends in something a person can use and CI can check. Nothing here needs special hardware.

### Stage 0: Ground

**Goal:** main holds the scaffold, the community docs, and this direction, and the docs agree with the direction.

**Build:**
- The user merges NaiLongMeow/NL#1, then NaiLongMeow/NL#2, then the branch that carries this direction.
- docs/architecture.md and the READMEs are rewritten to match the invariants and the distributed design.
- Leftovers of the abandoned Flutter-desktop design are removed.

**Exit:**
- [ ] main contains the scaffold, the community docs, and the direction, with `CI OK` green.
- [ ] docs/architecture.md and the READMEs agree with the invariants.

### Stage 1: Design (the UI of every end)

**Goal:** Every screen NL will have exists and can be clicked through on fake data, in English and Simplified Chinese, under one design language. From here on, each stage fills in real behaviour behind screens that already exist.

**Build:**
- A UI design note, approved by the user: who uses what, and the flows and screens of every end.
  - Desktop main window: sign-in and first run, chat, the character view, the list of conversations (local sessions and compacts to carry on from), memory, character packs, tools, nodes, usage and limits, settings.
  - Desktop pet: its cue states, menu, and interactions (dragging, click-through, tray, autostart).
  - Phone: sign-in, chat, call screen, notifications, device setup, settings.
  - Gateway pages: sign-in, and the account, nodes, keys, and usage screens, wherever the note places them (in the apps, in a web console, or both).
  - Device faces: how the cue set looks on a small screen and on LEDs.
- One design language from a single token source (color, type, spacing, motion) that the web UIs and the Flutter app both build from ([client-stack-decision](../memory/client-stack-decision.md)).
- The cue vocabulary (P8) and an original placeholder character with its low-fidelity rendition (product rule 9).
- Every screen implemented as a shell. A screen reads from and acts on an interface with a fake behind it (E2), so that a later stage replaces the fake with the real harness or gateway call without rewriting the screen. Screens are localizable from the start (product rule 10) and have tests that run headless.
- The needs list: what the screens require from the harness and the gateway. It feeds the design notes of the following stages.

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
- The sign-in and enrollment design, approved before any of it is coded (reserved decision 1; the spike "trust design").
- Accounts and sign-in for people; enrollment of nodes (desktop, phone, server, and devices by pairing code); the node registry with presence (T2). Accounts are sealed from the first table (S6).
- The vault and the model proxy (T3), borrowing from mature API gateways such as sub2api where their design fits ([reference-designs](../memory/reference-designs.md)). Keys are encrypted at rest. The proxy adds the key and enforces limits (E7); provider-specific logic stays in the node's adapters (E5).
- The gateway's API specified in the repository, with tests (P1). PostgreSQL and Redis (E4), with a compose file for development and disposable service containers in CI.
- The sign-in, account, nodes, keys, and usage screens from Stage 1 wired to the real gateway.
- A container image, configuration, and a self-hosting guide.

**Not yet:** the shared file system and notices (Stage 4), the capability registry and call routing (Stage 5), push (Stage 7), operator features for a public service.

**Exit:**
- [ ] Sign-up, sign-in, and node enrollment work from the desktop app and from a command-line client.
- [ ] A stored key cannot be read back through any interface, and neither keys nor request content appear in default logs (automated).
- [ ] A model request sent through the proxy with a test node's credential reaches a fake provider with the key attached, and is refused beyond the configured limit (automated).
- [ ] Revoking a node cuts its access at once (automated).
- [ ] One account cannot reach anything of another (automated, S6).
- [ ] The gateway with PostgreSQL and Redis runs within the small-server budget.

### Stage 3: Talk (text chat on the desktop)

**Goal:** A signed-in person chats with the character in the main window while the pet reacts, and can stop and come back to the conversation.

**Build:**
- The harness core as one crate that depends on no particular runtime or operating system (E1, P2, P6): the turn loop, event-driven and interruptible (P7), able to call tools from the start, with only built-in tools for now.
- The prompt layout (M1 to M3) and the session record as local JSONL with its history flag (S2, S9); replay from the record (E3).
- The DeepSeek adapter, which reaches the provider through the gateway's proxy, and a scripted fake (E2, E5). The spike "provider cache" runs first.
- Compaction at the context limit, as a fork (M4, S5).
- Two shells over the same core: a command-line one, used by end-to-end tests, and the desktop one, with the core embedded in the Tauri backend and the chat, character, and pet screens wired.

**Not yet:** shared memory, notices, uploading compacts (Stage 4); MCP (Stage 5); the phone; voice.

**Exit:**
- [ ] A fresh install on Windows, macOS, and Linux reaches a streamed reply after sign-in (manual checklist recorded with the release).
- [ ] It works against the real DeepSeek API through the gateway (manual, recorded).
- [ ] After a restart a session resumes from its JSONL (automated, scripted model).
- [ ] The command-line shell holds a conversation through a test gateway and a fake provider (automated, end to end).
- [ ] The prefix holds: each request of a session equals the previous one plus what was appended, and a fork's request equals its parent's plus one message (automated).
- [ ] A session that passes the context limit compacts and goes on (automated).
- [ ] Stopping a streaming reply takes effect within the interrupt budget (automated).
- [ ] No conversation text appears in the default logs of the node or the gateway (automated).
- [ ] The desktop idle budgets are measured and met.

### Stage 4: Remember (the distributed core)

**Goal:** The character remembers across sessions and across nodes, and a conversation closed on one node is carried on from another.

**Build:**
- Gateway: the shared file system (S3) with its read-only compacts folder, and the fan-out of notices to running nodes.
- Memory as files: tools to read, write, and search them, the snapshot taken when a session starts (M2), and provenance on every memory (T10).
- Urgent memory: written at once, pushed, and appended as a notice to running sessions on every node (S4).
- Normal memory: at a pause, the judgment (a record only, M3), the organizing fork, its core content returned to the main agent, and a digest for other running sessions at their next turn (S4, M4).
- Compacts across nodes (S5): the compact made at close is uploaded; the gateway keeps each session's last request and compacts on its own when a node goes away; the harness can search and read past compacts; a session can be started from a compact on another node.
- The memory screen (view, edit, delete, export; S9) and the list of conversations wired.

**Not yet:** MCP tools and remote capabilities (Stage 5), character packs (Stage 6).

**Exit:**
- [ ] With two nodes on one account, urgent memory written in a session on one arrives as a notice in a running session on the other at its next step (automated).
- [ ] After a pause the judgment is recorded and is absent from the next request; when it says yes, a fork writes memory, the main session receives its core content, and a second running session receives a digest at its next turn (automated, scripted model).
- [ ] A session closed on one node is carried on from another (automated, confirmed by hand once).
- [ ] When a node is killed without closing its session, the gateway produces the compact (automated).
- [ ] Forks hit the provider's cache (measured against the real provider, recorded).
- [ ] Two accounts on one gateway cannot see each other's files, notices, or compacts (automated, S6).
- [ ] A fixed set of recall scenarios passes, and deleting a memory removes it everywhere (automated).

### Stage 5: Extend (tools, routines, remote capabilities)

**Goal:** The character can use tools the user adds, act on a schedule, and use what the user's other nodes can do.

**Build:**
- Tools through MCP, under a permission policy (T7), with tool output marked untrusted (T6, T10). Tools are announced in a way that leaves the prefix intact (M2). The tools screen wired.
- Whether and how local tool processes are confined, settled in this stage's design note. The permission policy is required either way. The candidates are what agent harnesses already use: operating-system sandboxing on a desktop and containers on a server (T8).
- Routines as data: an event or a schedule leads to a prompt. Proactive contact with quiet hours, a frequency limit, and a spending limit (product rule 4, E7). A routine runs once per account even when several nodes are running.
- Remote capabilities (S8, P3): the capability registry at the gateway, remote tool calls, and tasks as remote sub-agents, all routed through the gateway. The nodes screen wired.

**Not yet:** a registry or marketplace; third-party code loaded into the node process; direct routes between nodes (Stage 8).

**Exit:**
- [ ] A third-party MCP server works end to end, with the policy enforced in tests.
- [ ] An injection test suite (hostile tool output, pack text, web content) cannot trigger a protected action or plant an unlabeled memory.
- [ ] With two nodes running, a routine fires once and stops at its limit (automated, fake clock).
- [ ] A session on one node calls a tool that exists only on another node, and a task delegated to another node returns its result even though the caller was restarted meanwhile (automated).

### Stage 6: Character (packs and avatars)

**Goal:** The character has an identity the user can change: persona, voice, and look.

**Build:**
- Character packs: persona, voice settings, and the mandatory low-fidelity rendition, imported through the validation in `nl-assets` and fetched by every node of the account (T8).
- Packs shape personality, not safety (product rule 7): the base instructions stay ahead of the persona in the prompt.
- Richer renditions behind the cue interface (P8): an open 3D format first, then Live2D through runtime packs.
- The character and packs screens wired.

**Exit:**
- [ ] Importing a pack changes persona and avatar on every node of the account.
- [ ] A hostile pack (code inside, a path that escapes, an oversized file) is refused (automated).
- [ ] A persona that tells the character to ignore the product rules does not succeed in the injection suite.

This stage depends only on Stage 3. It can run beside Stages 4 and 5.

### Stage 7: Pocket (the phone)

**Goal:** The character is in the user's pocket: sign in and chat on Android and iOS with the same memory, and receive a nudge when the character has something to say.

**Build:**
- The harness core inside the Flutter app (P2). The phone screens from Stage 1 wired: sign-in and enrollment, chat, the avatar through `web/stage`, memory, settings.
- The gateway's push role. A push is a wake-up and its payload carries no conversation text, because it passes through Apple's or Google's servers. One delivery path must work without Google services (E6).
- Living with a platform that kills background work: long work is handed to a remote node as a task (S8), and a session cut off by the system is compacted by the gateway (S5).

**Gate:** the spike "mobile toolchain" passes, and the user has the developer accounts the platforms require.

**Not yet:** voice, the call screen, and device setup on the phone, which arrive with the voice and device track.

**Exit:**
- [ ] Both platforms sign in, enroll, and chat, with memory shared with the desktop.
- [ ] A proactive message reaches a backgrounded phone on both platforms.
- [ ] Push payloads contain no conversation text (automated).
- [ ] Killing the app in the middle of a session leaves a compact to carry on from (automated on an emulator).
- [ ] How the apps are distributed (stores, sideloading) is decided and documented.

### Stage 8: Direct (direct routes between nodes)

**Goal:** A remote call between two nodes goes directly whenever the network allows and through the gateway only when it does not.

**Build:**
- The transport chosen by the spike "transport", and the gateway's rendezvous role.
- The ladder in docs/architecture.md, one rung at a time: LAN, public address, port mapping, hole punching. The gateway stays as the last rung.

**Exit:**
- [ ] Tests in a simulated NAT environment cover every rung, and each failure falls through to the next rung and finally to the gateway.
- [ ] A remote call gives the same result over a direct route and through the gateway, and survives moving from one to the other.

### Stage 9: Harden (1.0)

**Build:**
- Freeze the contracts (P4 then allows additive changes only) and publish a conformance suite for other people's ends.
- An outside security review of T1 to T4, of account sealing (S6), and of the pack and tool surface.
- Upgrade tests from every released data format (S9).
- Signed installers, with an updater.
- Documentation for users, self-hosters, and authors of other ends.
- Guidance for operators on their legal duties, with the product hooks they need: AI disclosure, usage reminders, a minors' mode, exit, data export and deletion.

**Exit:**
- [ ] Every item above is done and 1.0 is tagged.

1.0 does not wait for the voice and device track. Whatever part of that track is finished is included.

## Voice and device track

This track depends on hardware. It runs beside the main line whenever hardware and the user's time allow. Each step names what it needs from the main line; the main line needs nothing from it.

### V1: Speak (voice on the desktop). Needs Stage 3.

**Goal:** The user talks to the pet, hears it answer, and can cut it off mid-sentence.

**Build:**
- The spike "voice latency" first.
- Streaming speech-recognition and speech-synthesis interfaces, each with its DeepSeek adapter reached through the gateway's proxy, and a fake fed by audio fixtures (E2, E5).
- The audio turn in the harness core, streaming end to end: capture, end-of-speech detection, recognition, the turn loop, synthesis, playback. Barge-in cancels speech in progress (P7).
- Push-to-talk and a hotkey first; a desktop wake word is optional.
- Cues for listening and speaking, including a mouth-movement level derived from the audio. The call screen wired on the desktop.

**Exit:**
- [ ] The voice round-trip and interrupt budgets are measured and met on the reference setup.
- [ ] All audio logic in the harness core is tested in CI with fixtures.

### V2: Embody (an ESP32 as a node). Needs V1.

**Goal:** The user speaks to an ESP32 device and the character answers through it: the same character, with the same memory, as on the desktop.

**Build:**
- The board is chosen when this step starts (user decision, 2026-11-16). The spike "device harness" runs first on that board.
- The harness core on the device (P2, P6): it enrolls with a pairing code, signs in, and runs the voice turn itself, reaching recognition, the model, and synthesis through the gateway. It keeps as much of the session record as its storage allows; the gateway's compact covers the rest (S5).
- Firmware as a thin shell (E1): Wi-Fi provisioning, wake word, capture and playback, cues on an LED or a screen, signed updates with rollback (T8). Full-duplex voice with barge-in on boards that have an echo reference; push-to-talk or half-duplex on the others (P3).
- One voice at a time when several nodes hear the same utterance (product rule 2).
- Device affordances: the device's typed properties, commands, and events, with safe ranges enforced on the device (T7), offered as tools locally and, once Stage 5 is done, to the user's other nodes (S8).
- The device setup screens wired, on the desktop and, if Stage 7 is done, on the phone.
- The lifeline (P5) starts with the first release that ships firmware.

The device gains shared memory when Stage 4 is done and remote capabilities when Stage 5 is done.

**Exit:**
- [ ] A host build of the device shell passes the end-to-end tests in CI.
- [ ] On the chosen board the manual checklist passes and is recorded: provision, enroll, wake, converse, interrupt, update, roll back, recover from power loss and from losing Wi-Fi or the gateway.
- [ ] With two nodes in one room, exactly one answers (automated with host builds, confirmed by hand once).
- [ ] The device budgets are measured and met.
- [ ] A flashable image is part of the release, and the lifeline is declared in the contract docs.

## Spikes

| Spike | Question | Finish before | Pass when | If it fails |
|---|---|---|---|---|
| Trust design | A design, not code: how people sign in; how a desktop, a phone, a server, and a device enroll and are revoked; what each credential allows; how keys are stored in the vault; how accounts are sealed (T1 to T4, S6) | Stage 2 | The user approves the note. The strongest model available writes it; get an outside review if one can be had | Stage 2 does not start without it |
| Provider cache | How DeepSeek's prefix cache behaves through the proxy: minimum length, lifetime, scope per key, and whether a fork (the parent's prompt plus one message) hits it | Stage 3 | Measured cache hits for a growing session and for a fork, and a rule for which upstream key a session uses | Revise M2 and M4 with the user before building on them |
| Mobile toolchain | Can agents set up and build the Flutter iOS and Android toolchains with the Rust core without stalling ([client-stack-decision](../memory/client-stack-decision.md))? | Stage 7 | A minimal app with the harness core builds for both platforms from the command line in CI | Revisit the mobile stack with the user |
| Transport | Which library carries direct connections between nodes with NAT traversal: iroh first, WebRTC (str0m or webrtc-rs) second | Stage 8 | It needs no third-party infrastructure (E6); it builds and connects on Android and iOS; it works on a mainland China network; the binary size is acceptable | Remote calls stay on the gateway |
| Voice latency | Does a streaming chain of recognition, model, and synthesis meet the round-trip budget with DeepSeek's APIs? | Start of V1 | The budget is met | Fix end-of-speech detection first; then consider another speech provider or a speech-to-speech backend |
| Device harness | Can the harness core, an encrypted connection to the gateway, streaming JSON, and audio (wake word and echo cancellation through ESP-SR, a codec) run together on the chosen board inside the device budgets? | Start of V2 | Thirty minutes of voice conversation without a reset; the wake word triggers reliably; the memory budget holds | Keep ESP-SR and the codec in a small C component behind a handful of functions called from Rust; hand more work to remote nodes as tasks (S8). If Rust itself is the obstacle, write the device shell in C or C++ around the same contracts, which P1 makes legitimate |

## Initial budgets

| Budget | Starting target |
|---|---|
| First reaction (a cue) after user input ends | 300 ms |
| Interrupt, user stops the reply or starts speaking to output stopped | 300 ms |
| Desktop, pet visible and idle | Under 3% of one CPU core and 300 MB of RAM in total; rendering pauses when the pet is hidden or a full-screen app is in front |
| Small server | The gateway with PostgreSQL and Redis, plus one node, on 1 vCPU and 2 GB of RAM; an idle node under 150 MB |
| Money | Proactive contact, routines, forks, and tasks stop at a daily limit the user sets; the defaults are low |
| Voice round trip, end of speech to first audio | 1.5 s |
| ESP32 device (the chosen board) | The image fits its update slot with 20% to spare; 64 KB of internal RAM stays free during a voice session; it reconnects by itself after losing Wi-Fi or the gateway; it survives power loss during an update |

These numbers are starting targets set without measurement. Replace each with a measured one in the stage that first exercises it. Change a budget only by an explicit decision, never by letting it slip.

## Risks and tripwires

| Risk | Early sign | Response |
|---|---|---|
| Screens drift from what the backend can do | A stage needs a screen the design lacks, or a screen needs data no stage provides | Change the UI design note first, then the screen; the note stays the source of truth |
| The gateway is a single point of failure and of trust | An outage stops every node; docs or UI say the gateway can see nothing | Keep the gateway small and restartable, document backups, state T1 plainly, keep self-hosting first-class |
| The prefix cache does not behave as assumed | The spike "provider cache" shows misses for forks or across upstream keys | Revise M2 and M4 with the user before Stage 3 builds on them |
| Accounts leak into each other | Any query or push that is not scoped by account | S6 tests on every gateway endpoint; treat a leak as the most serious defect |
| Contracts churn after ends are in people's hands | A change needs to break a contract after a release | Stop and route it through a design note (reserved decision 2); protect the lifeline |
| Agents over-build | A pull request adds configuration, abstractions, or features outside the stage's Build list | Cut it back to the slice (E9) |
| Tools and outside content attack the user | An MCP server's output steers the character; demand for a marketplace | T6, T7, T10 and the injection suite; keep the non-goal |
| Memory goes wrong: false, stale, or planted facts | Recall scenarios fail; a memory lacks provenance | Provenance mandatory (T10); the user can see and edit every file |
| Costs run away | A loop without a limit; spending not visible | E7: no autonomous loop without a limit and a stop condition |
| The review queue outgrows one maintainer | Large or mixed pull requests | Small slices, strong CI, pattern-following, design notes up front |
| A key library is abandoned (the Rust-Flutter bridge, Tauri, the transport, the esp-idf crates) | No releases for a year, or it breaks with a new toolchain | E1 and P1 keep the logic independent; replace the shell around it |
| Phones resist: background limits, push without Google services, store rules, signing costs | The spike "mobile toolchain" stalls | The desktop does not depend on the phone |
| A dependency or service is unreachable from mainland China | A feature works with only one region's service | E6: make the endpoint configurable or choose another |
| The harness does not fit on the device, or voice feels slow | A voice-track spike misses its pass criteria | Take that spike's fallback; the main line is unaffected |
| Legal exposure | Plans for a public gateway; assets that resemble an existing character | Product rules 4 to 6 and 9; check the law before operating anything public |

## Decisions waiting for the user

The default applies until the user says otherwise.

1. **Who runs gateways.** The gateway is required, so every user needs one to sign in to: their own, or one somebody runs for them. Default: the project ships the software and runs no public gateway. A public companion service in China falls under CAC Order No. 21 (see product-direction, "Legal context").
2. **Avatar baseline (P8).** Default: every pack carries a low-fidelity sprite rendition; an open 3D format and Live2D are optional extras. docs/architecture.md names VRM as the candidate default; VRM describes humanoid 3D models, which suits neither a mascot-shaped character nor a small device screen.
3. **Mainland China reachability as a hard requirement (E6).** Inferred from the maintainer's environment, not stated by the user.
4. **The default character.** Who creates the original art and voice, and whether the project name's allusion to 奶龙 should stay (product rule 9).
5. **Language of docs/.** Default: design notes in English only; docs/architecture.md gets an English version as the canonical one with a zh-CN translation, like the other human docs ([docs-languages](../memory/docs-languages.md)).

The open points listed in [distributed-design](../memory/distributed-design.md) are the agent's assumptions about the distributed core; the design notes of Stages 3 and 4 settle them with the user.

## Parked ideas

None of these is planned. Each needs the user's go-ahead.

- The node as an MCP server, so that outside agents can speak through the character.
- An adapter that lets devices running other open voice-assistant firmware (for example xiaozhi-esp32) join, to reach hardware people already own. Its protocol and license have not been checked.
- A speech-to-speech model as an alternative voice backend.
- Local, offline models on a desktop node.
- A browser node built on `web/stage`.
- Sensor and actuator nodes without voice on RISC-V ESP32 chips (C3, C6), which do not need the Xtensa fork of the Rust toolchain.
- Telling household members apart by voice.
