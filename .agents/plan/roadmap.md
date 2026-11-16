# Roadmap

The long-term order of work for NL. Written 2026-11-16, when the repository held only project skeletons, CI, and the release pipeline, and NaiLongMeow/NL#1 (scaffold) and NaiLongMeow/NL#2 (community docs) were open and unmerged.

**Current stage: 0 (Ground).**

Read [product-direction](../memory/product-direction.md) and [architecture-invariants](../memory/architecture-invariants.md) first. Rule ids such as S1 and T3 refer to the invariants; "product rule 3" refers to the product direction. Outstanding tasks are in [TODO.md](../TODO.md).

## How to use this file

- Work only inside the **Build** list of the current stage. Anything under **Not yet**, in a later stage, or under "Parked ideas" waits, however convenient it looks. When a slice needs something from later, add a seam (an interface and a fake) and stop there (E9).
- If the user gives a task directly, do that task. If it conflicts with the current stage or an invariant, say so before starting.
- A stage is finished when every exit criterion has been demonstrated, the docs are true, and a release is tagged. Then tick the criteria, move "Current stage" forward, and clear the finished items from TODO.md.
- Budgets, spikes, risks, and open decisions referenced by the stages are at the end of this file.

## Working method

The project is planned by the strongest model available and built mostly by cheaper ones. Three habits keep that working.

1. **A design note opens each stage.** Before a stage's first code, a short note under `docs/design/` (`NNNN-short-title.md`, in English) fixes the protocol additions, data formats, security impact, test plan, and the ordered slices. The user approves it. Writing it is planning work for the strongest model available, and it is where reserved decisions get made.
2. **Pattern first, then follow.** The first implementation of each recurring pattern (a protocol service, a state machine with its fake and tests, a storage migration, a provider adapter, a UI talking to the node) becomes the example every later change copies, so it is written or closely reviewed by the strongest model available. TODO.md marks these slices `[pattern]`. Later slices follow the nearest pattern instead of inventing a new shape.
3. **Spikes answer questions; they do not ship code.** A spike is a time-boxed experiment on a `spike/*` branch that is never merged. Its result is a decision recorded in memory with its evidence, and the stage it gates starts from that decision.

When the same obstacle survives a real diagnosis and a second approach, stop and report what was tried and what was observed. Never get past an obstacle by weakening a rule, a test, or a budget.

## Stages

Each stage ends in something a person can use and CI can check.

### Stage 0: Ground

**Goal:** main holds the scaffold, the community docs, and this direction, and the docs agree with the direction.

**Build:**
- The user merges NaiLongMeow/NL#1, then NaiLongMeow/NL#2, then the branch that carries this direction.
- The user rules on the waiting decisions; docs/architecture.md is then brought in line with the invariants.
- Leftovers of the abandoned Flutter-desktop design are removed.
- The Stage 1 design note is written and approved.
- Spike H starts as soon as a board is on the desk, because it has the longest lead time.

**Exit:**
- [ ] main contains the scaffold, the community docs, and the direction, with `CI OK` green.
- [ ] docs/architecture.md agrees with the invariants.
- [ ] The Stage 1 design note is approved.

### Stage 1: Talk (the desktop alone, text)

**Goal:** A person installs the desktop app, enters a model key, and chats with the character in the main window while the pet reacts. The history survives a restart.

**Build:**
- Protocol basics: attaching a body to a host, and the turn (user text in; streamed text, cues, tool activity, end, and errors out; cancel).
- The turn engine in the host: event-driven and interruptible (E1, P7), able to call tools from the start, with only built-in tools for now.
- The language-model interface with two adapters (OpenAI-compatible and Anthropic) and a scripted fake (E2, E5).
- The event log on SQLite with replay and a tested migration path (S2, S5, S6).
- Memory v0: a rolling summary that bounds the context, and a small notes document about the user that the character updates through a tool and the user can read and edit (T10).
- The local vault and settings (T3).
- Same-machine attachment: an authenticated channel carrying protocol frames (P2, T5), `nl-node` running headless, and a command-line client used by end-to-end tests.
- Desktop: the node embedded in the Tauri backend, main-window chat with streaming and stop, the pet showing cues (idle, listening, thinking, speaking), tray and autostart, an original placeholder character with its low-fidelity rendition (P8), and English and zh-CN text.

**Not yet:** voice, sessions between machines, pairing, the gateway, retrieval or embeddings, MCP, pack import, mobile, firmware.

**Exit:**
- [ ] A fresh install on Windows, macOS, and Linux reaches a streamed reply after key entry (manual checklist recorded with the release).
- [ ] It works with one provider reachable from mainland China and one outside it (manual, recorded).
- [ ] After a restart the history is intact and the character uses a fact from its notes (automated, scripted model).
- [ ] The command-line client holds a conversation with a headless `nl-node` (automated, end to end).
- [ ] Stopping a streaming reply takes effect within the interrupt budget (automated).
- [ ] No key and no conversation text appear in default logs (automated).
- [ ] The desktop idle budgets are measured and met.

### Stage 2: Speak (voice on the desktop)

**Goal:** The user talks to the pet, hears it answer, and can cut it off mid-sentence.

**Build:**
- Streaming speech-recognition and speech-synthesis interfaces, each with two adapters and a fake fed by audio fixtures (E2, E5).
- The audio turn, streaming end to end: capture, end-of-speech detection, recognition, the turn engine, synthesis, playback. Barge-in cancels speech in progress (P7).
- Audio streams in the protocol (Opus voice audio in a compact framing, P6). The desktop microphone and speaker are the first audio body and use these streams as any other body would (P2).
- Push-to-talk and a hotkey first; a desktop wake word is optional.
- Cues for listening and speaking, including a mouth-movement level derived from the audio.
- Spike V runs at the start. Spike H and Spike P finish before the stage ends.

**Not yet:** the ESP32, bodies on other machines, speech-to-speech models (keep the interface able to host one later).

**Exit:**
- [ ] The voice round-trip and interrupt budgets are measured and met on the reference setup, with one provider set reachable from mainland China and one outside it.
- [ ] All host-side audio logic is tested in CI with fixtures.
- [ ] Text chat still passes every Stage 1 criterion.

### Stage 3: Embody (an ESP32 on the LAN)

**Goal:** The user speaks to an ESP32-S3 device and the character answers through it, while the desktop pet reacts as the same character. No gateway is involved.

**Build:**
- The trust design from Spike P, approved (T1 to T4): node identity, pairing with a verifiable step, revocation, encrypted sessions between nodes.
- LAN discovery, and the constrained profile (P6) over WebSocket, the single transport for constrained nodes. A host with a public address can serve a device the same way, which already covers "an ESP32 plus a server".
- The virtual body first (E2), with conformance tests that any firmware can be run against.
- Firmware as a thin shell (E1): Wi-Fi provisioning, pairing, wake word, capture and playback, Opus, cues on an LED or a screen, signed updates with rollback (T8). Full-duplex voice with barge-in on boards that have an echo reference; push-to-talk or half-duplex on the others (P3).
- Several bodies at once: one voice at a time, with the host choosing (product rule 2).
- A headless host on a home server as an alternative to the desktop app.
- The lifeline (P5) starts with this stage's release.

**Not yet:** remote access through a relay, NAT traversal, the phone app, device tools beyond a few built-in ones.

**Exit:**
- [ ] The virtual body passes the conformance tests in CI.
- [ ] On the reference board the manual checklist passes and is recorded: provision, pair, wake, converse, interrupt, update, roll back, recover from power loss and from losing Wi-Fi or the host.
- [ ] With two bodies in one room, exactly one answers (automated with virtual bodies, confirmed by hand once).
- [ ] The device budgets are measured and met.
- [ ] A flashable image is part of the release, and the lifeline is declared in the protocol docs.

### Stage 4: Remember (depth)

**Goal:** Over weeks the character comes to know the user, and it has an identity of its own.

**Build:**
- Memory v1: durable facts and episodes extracted with provenance (T10), retrieval over derived indexes (S2), consolidation in the background within a budget (E7), and newer facts superseding older ones without erasing history.
- The memory screen: view, edit, delete, export (S6).
- Character pack v1: persona, voice settings, and the mandatory low-fidelity rendition, imported through the validation in `nl-assets` (T8). Richer renditions behind the cue interface come after it: an open 3D format first, then Live2D through runtime packs.
- Proactive contact v1 with quiet hours, a frequency limit, and a spending limit (product rule 4, E7).
- A small, inspectable relationship state, for example mood and familiarity.

**Not yet:** sharing or a marketplace for packs, several characters in one home, telling speakers apart.

**Exit:**
- [ ] A fixed set of recall scenarios passes (a scripted model for the mechanics, a documented live checklist for quality).
- [ ] Deleting a memory removes it from every index and from exports.
- [ ] Importing a pack changes persona, voice, and avatar on every connected body.
- [ ] Proactive contact respects quiet hours and both limits in tests.

This stage depends only on Stage 1. It can run beside Stages 2 and 3, or be pulled ahead of them if the user prefers.

### Stage 5: Reach (the gateway and a host on a server)

**Goal:** The character is reachable from anywhere. The host can run on a server, nodes on different networks find each other, directly when they can and through the relay when they cannot, and an ESP32 away from its host still works.

**Build:**
- Node-to-node transport chosen by Spike T, climbing the ladder in docs/architecture.md: LAN, public address, port mapping, hole punching, relay.
- Gateway roles in this order: rendezvous and relay (ciphertext only, T1); accounts and a device registry; the vault and model proxy with usage limits (T3, E7).
- Constrained nodes reaching their host through the relay.
- Host handover between a desktop and a server (S1).
- A self-hosting guide: one binary, one configuration file, a container image (E4, E6).

**Not yet:** features for operating a public multi-tenant service (billing, moderation), horizontal scaling, federation between gateways.

**Exit:**
- [ ] Tests in a simulated NAT environment cover every rung of the ladder.
- [ ] A test shows that the relay cannot read a relayed session.
- [ ] A home with its host on a server and an ESP32 on another network converses within the relayed budget.
- [ ] The gateway and a node run together on a 1 vCPU / 1 GB server.
- [ ] The vault is write-only (automated).

### Stage 6: Pocket (the phone)

**Goal:** The character is in the user's pocket: chat and talk on Android and iOS, receive a nudge when the character has something to say, and set up an ESP32 from the phone.

**Build:**
- The Rust core inside the Flutter app, as a body and never a host (S4).
- Pairing by QR code, chat, voice, and the avatar through `web/stage`.
- Push as a content-free wake-up: the payload carries no conversation text (T1). One delivery path must work without Google services (E6).
- ESP32 provisioning from the phone.
- A call-style screen where the platform allows it.

**Gate:** Spike M passes, and the user has the developer accounts the platforms require.

**Exit:**
- [ ] Both platforms pair, chat, and talk over direct and relayed routes.
- [ ] A proactive message reaches a backgrounded phone on both platforms.
- [ ] Push payloads contain no plaintext content (automated).
- [ ] How the apps are distributed (stores, sideloading) is decided and documented.

### Stage 7: Extend (programmable)

**Goal:** Users and other agents can teach the character new abilities and drive its bodies.

**Build:**
- Tools through MCP on the host, under a permission policy (T7), with tool output marked untrusted (T6, T10).
- Device affordances: bodies declare typed properties, commands, and events with safe ranges, and the host offers them to the model as tools.
- Routines as data: an event or a schedule leads to a prompt.
- The host as an MCP server, so that outside agents can speak through the character and use its devices.
- Background sub-agents for slow work (product rule 3).
- Sandboxed plugins (WASM), only after all of the above are stable.

**Not yet:** a registry or marketplace.

**Exit:**
- [ ] A third-party MCP server and a custom device affordance work end to end, with the policy enforced in tests.
- [ ] An injection test suite (hostile tool output, pack text, web content) cannot trigger a protected action or plant an unlabeled memory.

### Stage 8: Harden (1.0)

**Build:**
- Freeze the protocol (P4 then allows additive changes only) and publish the conformance suite.
- An outside security review of T1 to T4 and of the pack and plugin surface.
- Upgrade tests from every released data format (S6).
- Signed installers and firmware, with an updater.
- Documentation for users, self-hosters, and authors of other firmware.
- Guidance for operators on their legal duties, with the product hooks they need: AI disclosure, usage reminders, a minors' mode, exit, data export and deletion.

**Exit:**
- [ ] Every item above is done and 1.0 is tagged.

## Why this order

- Deterministic, host-side work comes first. It is what agents build and test best, and it carries the patterns everything else copies.
- The riskiest unknowns (audio on the device, the trust design, NAT traversal, mobile toolchains) are probed by spikes long before the stages that depend on them.
- The gateway waits until two ends work together on a LAN. Before that it has nothing to relay, and S7 requires the product to work without it.
- The phone follows the gateway because a phone is mostly away from the LAN and needs the relay and push.
- Programmability follows the core because third-party tools and content need the trust, policy, and provenance machinery to exist first.

## Spikes

| Spike | Question | Finish before | Pass when | If it fails |
|---|---|---|---|---|
| H: device audio | Can Rust on ESP-IDF run wake word and echo cancellation (ESP-SR), Opus, Wi-Fi, and an encrypted session together on an ESP32-S3 with 8 MB PSRAM, inside the device budgets? | Stage 3; start in Stage 0, needs the user's board | Thirty minutes of two-way audio with a host program without a reset; the wake word triggers reliably; the memory budget holds | Keep ESP-SR and the codec in a small C component behind a handful of functions called from Rust. If Rust itself is the obstacle, write the firmware shell in C or C++ against the same protocol, which P1 makes legitimate |
| P: pairing and trust | A design, not code: how a home is created; how a desktop, a server, a phone, and an ESP32 are admitted and revoked; what each credential allows; how sessions are keyed (T1 to T4) | Stage 3 | The user approves the note. The strongest model available writes it; get an outside review if one can be had | Stage 3 does not start without it |
| V: voice latency | Does a streaming chain of recognition, model, and synthesis on the host meet the round-trip budget with two provider sets? | Early in Stage 2 | The budget is met with both sets | Fix end-of-speech detection and provider choice first; then consider a speech-to-speech backend for that provider set |
| T: transport | Which library carries sessions between full nodes with NAT traversal: iroh first, WebRTC (str0m or webrtc-rs) second | Stage 5 | Relay and discovery are self-hosted with no third-party infrastructure (E6); it builds and connects on Android and iOS through flutter_rust_bridge; the relay sees only ciphertext; it works on a mainland China network; the binary size is acceptable | WebRTC data channels with a self-hosted TURN server; as a last resort, relay-only for phones |
| M: mobile toolchain | Can agents set up and build the Flutter iOS and Android toolchains with the Rust core without stalling ([client-stack-decision](../memory/client-stack-decision.md))? | Stage 6 | A minimal app with the Rust core builds for both platforms from the command line in CI | Revisit the mobile stack with the user |

## Initial budgets

| Budget | Starting target |
|---|---|
| First reaction (a cue) after user input ends | 300 ms |
| Voice round trip, end of speech to first audio | 1.5 s with the host on the LAN; 2.5 s through the relay |
| Interrupt, user starts speaking to playback stopped | 300 ms |
| ESP32-S3 reference device (16 MB flash, 8 MB PSRAM) | The image fits its update slot with 20% to spare; 64 KB of internal RAM stays free during a voice session; it reconnects by itself after losing Wi-Fi or the host; it survives power loss during an update |
| Desktop, pet visible and idle | Under 3% of one CPU core and 300 MB of RAM in total; rendering pauses when the pet is hidden or a full-screen app is in front |
| Node and gateway | Both on one 1 vCPU / 1 GB server; an idle node under 150 MB of RAM |
| Voice on the network | 32 kbit/s in each direction |
| Money | Proactive contact, consolidation, and sub-agents stop at a daily limit the user sets; the defaults are low |

These numbers are starting targets set without measurement. Replace each with a measured one in the stage that first exercises it. Change a budget only by an explicit decision, never by letting it slip.

## Risks and tripwires

| Risk | Early sign | Response |
|---|---|---|
| Device audio in Rust on ESP-IDF proves fragile | Spike H misses its pass criteria | Take the fallback in Spike H; the protocol does not change |
| The protocol churns after devices are in homes | A change needs the breaking-change label after Stage 3 | Stop and route it through a design note (reserved decision 2); protect the lifeline |
| Privacy claims outrun the design | Docs or UI say the gateway can see nothing | Restate from T1: the model proxy sees requests in transit |
| Voice feels slow | The round trip misses its budget in Spike V or Stage 2 | Fix streaming and end-of-speech detection before adding features |
| Agents over-build | A pull request adds configuration, abstractions, or features outside the stage's Build list | Cut it back to the slice (E9) |
| Memory goes wrong: false, stale, or planted facts | Recall scenarios fail; a memory lacks provenance | Keep the log canonical (S2), provenance mandatory (T10), and the user able to edit |
| Costs run away | A loop without a limit; spending not visible | E7: no autonomous loop without a limit and a stop condition |
| Third-party content attacks the user | Demand for a pack or plugin marketplace before Stage 7's policy exists | Keep the non-goal; packs stay data-only (T8) |
| The review queue outgrows one maintainer | Large or mixed pull requests | Small slices, strong CI, pattern-following, design notes up front |
| A key library is abandoned (the esp-idf crates, the transport, the Rust-Flutter bridge, Tauri) | No releases for a year, or it breaks with a new toolchain | E1 and P1 keep the logic independent; replace the shell around it |
| Phones resist: background limits, push without Google services, store rules, signing costs | Spike M stalls | The phone stays the last body; the desktop and the ESP32 do not depend on it |
| A dependency or service is unreachable from mainland China | A feature works with only one region's service | E6: make the endpoint configurable or choose another |
| Legal exposure | Plans for a public service; assets that resemble an existing character | Product rules 4 to 6 and 9; check the law before operating anything public |

## Decisions waiting for the user

The default applies until the user says otherwise.

1. **Keys on a host the user runs (T3).** Default: allowed, in the operating system's credential store, so that the desktop app works without a gateway. docs/architecture.md said keys live only in the gateway.
2. **Embedded storage first (E4).** Default: SQLite for the node and the gateway; PostgreSQL or Redis only when a deployment needs them. docs/architecture.md named PostgreSQL and Redis.
3. **Avatar baseline (P8).** Default: every pack carries a low-fidelity sprite rendition; an open 3D format and Live2D are optional extras. TODO.md used to name VRM as the leading default. VRM describes humanoid 3D models, which suits neither a mascot-shaped character nor a small device screen.
4. **No public service run by the project.** Default: self-hosting only. A public companion service in China falls under CAC Order No. 21 (see product-direction, "Legal context").
5. **Stage order.** Default: Talk, Speak, Embody, Remember. Remember can move ahead of Speak if a desktop companion with memory matters more than the first ESP32 demo.
6. **Reference hardware for Stage 3.** This needs an answer: which ESP32 board the user has. Assumed until then: an ESP32-S3 with 16 MB flash, 8 MB PSRAM, and an I2S microphone and amplifier, plus a board with an echo-reference channel (for example ESP32-S3-BOX-3) as the reference for full-duplex voice.
7. **Mainland China reachability as a hard requirement (E6).** Inferred from the maintainer's environment, not stated by the user.
8. **The default character.** Who creates the original art and voice, and whether the project name's allusion to 奶龙 should stay (product rule 9).
9. **Language of docs/.** Default: design notes in English only; docs/architecture.md gets an English version as the canonical one with a zh-CN translation, like the other human docs ([docs-languages](../memory/docs-languages.md)).

## Parked ideas

None of these is planned. Each needs the user's go-ahead.

- An adapter that lets devices running other open voice-assistant firmware (for example xiaozhi-esp32) act as bodies, to reach hardware people already own. Its protocol and license have not been checked.
- A speech-to-speech model as an alternative voice backend.
- Local, offline models on a desktop host.
- A browser body built on `web/stage`.
- Sensor and actuator nodes without voice on RISC-V ESP32 chips (C3, C6), which do not need the Xtensa fork of the Rust toolchain.
- Telling household members apart by voice; several characters in one home.
- Automatic host failover.
