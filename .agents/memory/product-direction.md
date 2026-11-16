---
name: product-direction
description: Recall before proposing, designing, or prioritizing any feature. Says what NL is for, what wins when goals conflict, what NL deliberately does not do, the words every end uses, and how the character must treat the user.
metadata:
  type: project
  scope: Whole project; product goals, priorities, non-goals, vocabulary, and product rules
  status: active
  last_verified: 2026-11-16
---

NL lets one AI character live across a person's devices (a desktop pet, a phone, small ESP32 gadgets) as one continuous companion that remembers them everywhere, stays private by default, and can be programmed. Small devices do the light work, stronger nodes do the heavy work, and every end can borrow compute or storage from the others. The rules that keep the system sound are in [[architecture-invariants]]; the order of work is in [the roadmap](../plan/roadmap.md).

## What makes NL different

Work that strengthens these comes first. Work that serves none of them needs a reason.

1. **One character, many bodies.** The same relationship continues on whichever device the user turns to.
2. **Embodiment in cheap hardware.** An ESP32 can be the character's ears, voice, face, and hands.
3. **Privacy by architecture.** The user's own node holds the data, relays cannot read it, and everything can be self-hosted.
4. **An open protocol.** Any end can be replaced or rewritten, including by someone else's firmware in another language.

## Priorities when goals conflict

Earlier wins.

1. The companion experience: continuity, memory, quick reactions, a consistent personality.
2. Privacy and the user's ownership of their data.
3. Working on modest hardware and ordinary networks: an ESP32-S3, a 1 vCPU / 1 GB server, home NAT, networks inside and outside mainland China.
4. Replaceable parts over shortcuts between parts.
5. Toolchains an agent can drive from a command line ([[tech-choice-criteria]]).

Generality, feature count, and peak capability come after all five.

## Non-goals

Do not build these, even when a task seems to invite it. Lifting one is a decision for the user.

- A general coding agent or general chat client. Harness mechanics learned from coding agents are welcome; their product scope is not.
- A smart-home hub. NL's own devices are the character's bodies and senses. Other people's devices arrive through tools (MCP, Home Assistant), never through NL-specific drivers.
- Language models on microcontrollers, and training or hosting models.
- A public service run by the project. NL ships software that people host themselves. Running a companion service for the public brings legal duties (see "Legal context") and is a separate decision.
- A marketplace or registry for characters, skills, or plugins, until a security model for third-party content exists.
- Multi-master synchronization of a character's state, automatic failover between hosts, and mesh routing in which one body forwards traffic for another.
- Supporting every board, provider, or avatar format. One reference path that works beats five that half work.
- Streaming or VTuber production tooling.

## Vocabulary

Use these words with these meanings in the protocol, code, and docs. Do not coin synonyms for them.

| Term | Meaning | zh-CN in human docs |
|---|---|---|
| Home | One person's or household's trust domain: their nodes and characters | 家 |
| Node | A running NL end with its own identity key: the desktop app, `nl-node` on a server, a phone, an ESP32 | 节点 |
| Host | The one node that owns a character's state and runs its agent loop | 宿主节点 |
| Body | A node acting as the character's presence: it shows, speaks, listens, senses, or acts. The host can also be a body | 化身 |
| Capability | Something a node declares it can do for others: audio in or out, avatar, speech recognition, speech synthesis, language model, storage, sensors, actuators | 能力 |
| Session | An authenticated, encrypted connection between two nodes | 会话 |
| Turn | One exchange: user input, then the character's streamed reply, tool actions, and cues | 轮次 |
| Cue | A renderer-independent expression signal: an emotion, listening, thinking, speaking, a gesture | 表现提示 |
| Character pack | Data that defines a character: persona, voice settings, avatar renditions | 角色包 |
| Vault | Where API keys live | 密钥库 |
| Gateway | The optional central service: rendezvous, relay, accounts, vault, push | 网关 |

## Product rules

These describe how the character treats the user, whatever the implementation. Treat them as acceptance criteria.

1. **One continuity.** Every body continues the same relationship. A body never has its own personality or memory.
2. **One voice at a time.** When several bodies hear the user, exactly one answers; the host decides which.
3. **Alive, never blocking.** The user gets a visible or audible reaction within about 300 ms and can always interrupt. Slow work (long tools, memory consolidation, sub-agents) runs in the background and reports back.
4. **The user is in charge.** The user has quiet hours, mute, a limit on proactive contact, and a way to see, edit, export, and delete everything the character remembers. Ending a conversation takes effect at once.
5. **Honest and not manipulative.** The product makes clear that the character is an AI, and the character never claims to be human. It never pressures the user to stay, never guilt-trips, and is never tuned for engagement or dependence.
6. **Care in a crisis.** When the user signals self-harm or acute distress, the character responds with care and points to real help. This belongs to the host's base instructions.
7. **Packs shape personality, not safety.** A character pack cannot override rules 4 to 6 or any policy check in [[architecture-invariants]]. Pack text is content, not authority.
8. **An honest microphone.** Audio leaves a device only after a local wake word, a button press, or an explicitly opened session, and the device shows that it is listening.
9. **Original, licensed content only.** The default character, its art, and its voice are original work under an open license and suitable for all ages. No third-party characters, voices, or proprietary runtimes enter the repository ([[live2d-asset-packs]]). The project's name alludes to an existing commercial cartoon character (奶龙) whose rights holder enforces its copyright; nothing NL ships may imitate that character's look, name, or voice.
10. **Two languages from the first screen.** User-facing text is localizable, and English and Simplified Chinese are maintained together.

## Legal context

China's Interim Measures for the Administration of Anthropomorphic AI Interaction Services (CAC Order No. 21, in force since 2026-07-15) apply to whoever provides continuing emotional-interaction AI services to the public in China. Among other duties, a provider must make clear that the user is talking to an AI, remind the user after two hours of continuous use, offer an immediate exit, run a minors' mode with guardian functions, intervene on self-harm signals, let users copy and delete their interaction data, and must not design for dependence or emotional manipulation. Other jurisdictions are adopting comparable rules (not checked here).

NL is software, not such a service. Product rules 4 to 6 keep the product on the right side of these duties and give an operator the hooks to meet them. Anyone who runs NL for the public is the provider and must check the law in force at that time.

**Why:** The project starts from zero and will be built mostly by agents less capable than the one that planned it. Without a stated purpose, a priority order, and a list of things not to build, each session optimizes for whatever its own task suggests, and the product drifts toward a generic chat client with unrelated features.

**How to apply:** Before proposing or building a feature, check which differentiator it serves and whether it touches a non-goal; if it touches one, stop and ask the user. When two designs both work, choose by the priority order. A feature that breaks a product rule is not done.

**Evidence:** The core purpose in AGENTS.md and the principles in docs/architecture.md (user decisions, 2026-11-15). On 2026-11-16 the user said that nothing has been built yet, that they want long-term constraints and direction rather than a detailed technical design, and that cheaper models will do the implementation. The differentiators, priorities, non-goals, vocabulary, and product rules above were set in that planning session under that delegation; the user may overrule any of them. Legal text: https://www.cac.gov.cn/2026-04/10/c_1777558395078289.htm, read 2026-11-16. Copyright enforcement over 奶龙: court cases reported at http://js.news.cn/20240516/c9f8fb6b11174d4ea8197921dde754f0/c.html and https://www.thepaper.cn/newsDetail_forward_27181619, read 2026-11-16.

**Recheck when:** The user changes the project's purpose or lifts a non-goal, the project decides to operate a public service, or the legal rules for companion AI change.
