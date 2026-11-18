---
name: product-direction
description: Recall before proposing, designing, or prioritizing any feature. Says what NL is for, what wins when goals conflict, what NL deliberately does not do, the words every end uses, and how the character must treat the user.
metadata:
  type: project
  scope: Whole project; product goals, priorities, non-goals, vocabulary, and product rules
  status: active
  last_verified: 2026-11-18
---

NL gives one user one AI character that lives on all of their devices (a desktop pet, a phone, small ESP32 gadgets) as one companion with one memory. The same harness runs on every device, light or heavy, and a device that is short of something borrows it from another. The rules that keep the system sound are in [[architecture-invariants]], the way sessions and memory work across devices is in [[distributed-design]], and the order of work is in [the roadmap](../plan/roadmap.md).

## What makes NL different

Work that strengthens these comes first. Work that serves none of them needs a reason.

1. **One character, everywhere at once.** The same character with the same memory on whichever device the user turns to, in several places at the same time if they like, and a conversation that can be carried on from another device.
2. **Embodiment in cheap hardware.** An ESP32 runs the same harness and can be the character's ears, voice, face, and hands.
3. **Your data, your gateway.** Accounts are sealed from each other, the user can see, export, and delete everything, and the whole system, the gateway included, can be self-hosted.
4. **Open contracts.** Any end can be replaced or rewritten, including by someone else's code in another language.

## Priorities when goals conflict

Earlier wins.

1. The companion experience: continuity, memory, quick reactions, a consistent personality.
2. The user's ownership of their data: sealed accounts, export, deletion, self-hosting.
3. Working on modest hardware and ordinary networks: an ESP32-S3, a small rented server, home NAT.
4. Replaceable parts over shortcuts between parts.
5. Toolchains an agent can drive from a command line ([[tech-choice-criteria]]).

Generality, feature count, and peak capability come after all five.

## Non-goals

Do not build these, even when a task seems to invite it. Lifting one is a decision for the user.

- A general coding agent or general chat client. Harness mechanics learned from coding agents are welcome; their product scope is not.
- A smart-home hub. NL's own devices are the character's senses and hands. Other people's devices arrive through tools (MCP, Home Assistant), never through NL-specific drivers.
- Running language models on microcontrollers, and training or hosting models. The harness loop runs on an ESP32; the model does not.
- Several users or several characters in one account. One account is one user and one character.
- Synchronizing transcripts or merging divergent histories. A session's JSONL stays on its node; continuity comes from memory and compacts.
- Hiding data from the gateway. The gateway is trusted; end-to-end encryption against it is not a requirement.
- A whole interactive session hosted on a remote node. Remote tool calls and tasks are enough.
- Operator features for a public service: billing, content-moderation tooling, growth mechanics. One gateway serves many accounts, and every user needs a gateway to sign in to. Whoever deploys a gateway runs it and carries its duties (see "Legal context"); the project ships the software.
- A marketplace or registry for characters, skills, or plugins, until a security model for third-party content exists.
- Mesh routing, in which one node forwards traffic for another.
- Supporting every board, provider, or avatar format. One reference path that works beats five that half work.
- Streaming or VTuber production tooling.

## Vocabulary

Use these words with these meanings in contracts, code, and docs. Do not coin synonyms for them.

| Term | Meaning | zh-CN in human docs |
|---|---|---|
| Account | One user and their one character; sealed from every other account | 账号 |
| Node | A running NL end signed in to an account: the desktop app, a server, a phone, an ESP32. Every node runs the harness | 节点 |
| Harness | The agent runtime on every node: the turn loop, tools, forks, compaction | harness |
| Gateway | The central, trusted service every node signs in to: login, the vault and model proxy, the shared file system, notices, the capability registry, relaying | 网关 |
| Session | One conversation of the character on one node, recorded there as JSONL. Several can run at once. Short-lived: an idle session compacts and archives itself | 会话 |
| Shared session, device session | The two kinds of session (user, 2026-11-18). As the agent reads them, not yet confirmed: a shared session belongs to the account and every device can open it; a device session belongs to one device and uses its tools ([[distributed-design]]) | 共享会话、设备会话 |
| Dispatch | Handing tasks from one session to other sessions that accept tasks, or to new ones; a dispatched task outlives the session that dispatched it | 分派 |
| Turn | One exchange: user input, then the character's working text, tool calls, messages, and cues | 轮次 |
| Message | What the character sends the user with the message tool: the only output shown as a bubble, spoken aloud, shown by the pet, or pushed as a notification (M5) | 消息 |
| Working text | What the model writes outside tool calls. It stays in the history and is shown only in a conversation's full view | 过程正文 |
| Shared file system | The account's files that every node sees: memory, and a read-only folder of compacts | 共享文件系统 |
| Memory | What the character knows durably, kept as files in the shared file system | 记忆 |
| Notice | A message the harness appends to a running session: urgent memory from elsewhere, a digest, a fork's result. It is not typed by the user and not shown as a notification | 提示消息 |
| Fork | A side run that reuses a session's whole prompt and adds one instruction | 分叉（fork） |
| Compact | A summary that stands in for a conversation: made at the context limit and at close, and the thing another node carries on from | 压缩（compact） |
| Capability | Something a node declares it can do for others | 能力 |
| Toolset | A named group of related tools in NL's toolset format; an MCP server used directly counts as one. The model finds tools with tool_search and calls them through use_tool (M6) | 工具集 |
| Preset agent | A built-in kind of sub-agent with its own instructions, such as the tool finder | 预设 agent |
| Remote tool call | Using a tool that lives on another node; short, answered at once | 远程工具调用 |
| Task | Work dispatched to a session, on this node or a remote one, which runs it as its own and reports the result | 任务 |
| Cue | A renderer-independent expression signal: an emotion, listening, thinking, speaking, a gesture | 表现提示 |
| Character pack | Data that defines a character: persona, voice settings, avatar renditions | 角色包 |
| Vault | Where API keys live, inside the gateway | 密钥库 |

## Product rules

These describe how the character treats the user, whatever the implementation. Treat them as acceptance criteria.

1. **One character, one memory.** Every node and every session is the same character with the same memory. Sessions may run side by side, and a conversation can be carried on from another node.
2. **One voice at a time.** When several nodes hear the same utterance, exactly one answers.
3. **Alive, never blocking.** The user gets a visible or audible reaction within about 300 ms and can always interrupt. Slow work (long tools, organizing memory, tasks) runs beside the conversation and reports back.
4. **The user is in charge.** The user has quiet hours, mute, a limit on proactive contact, and a way to see, edit, export, and delete everything the character remembers. Ending a conversation takes effect at once.
5. **Honest and not manipulative.** The product makes clear that the character is an AI, and the character never claims to be human. It never pressures the user to stay, never guilt-trips, and is never tuned for engagement or dependence.
6. **Care in a crisis.** When the user signals self-harm or acute distress, the character responds with care and points to real help. This belongs to the harness's base instructions.
7. **Packs shape personality, not safety.** A character pack cannot override rules 4 to 6 or any policy check in [[architecture-invariants]]. Pack text is content, not authority.
8. **An honest microphone.** Audio leaves a device only after a local wake word, a button press, or an explicitly opened session, and the device shows that it is listening.
9. **Licensed content only.** The project is named NL, and its default character is 大肥鱼 (user decision, 2026-11-16): the DeepSeek community's blue-haired whale girl, with whale fins and a large tail. It is fan-made, not DeepSeek's: it grew from 溟月, an original character that the Bilibili creator 上善无形 made with AI image generation, which other fans then reworked with DeepSeek elements, a maid outfit, and a chibi version. Art and voice for it enter the repository or a pack only under a license that allows redistribution from whoever made that particular art, recorded beside the asset, and what the project ships is suitable for all ages. No other third-party characters, voices, or proprietary runtimes enter the repository ([[live2d-asset-packs]]). Nothing NL ships imitates 奶龙, a commercial cartoon character whose rights holder enforces its copyright.
10. **Two languages from the first screen.** User-facing text is localizable, and English and Simplified Chinese are maintained together. Prompts are a separate matter: they are always English (M1).

## Legal context

China's Interim Measures for the Administration of Anthropomorphic AI Interaction Services (CAC Order No. 21, in force since 2026-07-15) apply to whoever provides continuing emotional-interaction AI services to the public in China. Among other duties, a provider must make clear that the user is talking to an AI, remind the user after two hours of continuous use, offer an immediate exit, run a minors' mode with guardian functions, intervene on self-harm signals, let users copy and delete their interaction data, and must not design for dependence or emotional manipulation. Other jurisdictions are adopting comparable rules (not checked here).

NL is software, not such a service. Product rules 4 to 6 keep the product on the right side of these duties and give an operator the hooks to meet them. Anyone who runs a gateway for the public is the provider and must check the law in force at that time.

**Why:** The project starts from zero and will be built mostly by agents less capable than the one that planned it. Without a stated purpose, a priority order, and a list of things not to build, each session optimizes for whatever its own task suggests, and the product drifts toward a generic chat client with unrelated features.

**How to apply:** Before proposing or building a feature, check which differentiator it serves and whether it touches a non-goal; if it touches one, stop and ask the user. When two designs both work, choose by the priority order. A feature that breaks a product rule is not done.

**Evidence:** The core purpose in AGENTS.md and the principles in docs/architecture.md (user decisions, 2026-11-15). On 2026-11-16 the user said that nothing has been built yet, that they want long-term constraints and direction rather than a detailed technical design, and that cheaper models will do the implementation; the priorities and most product rules were set by the agent in that session under that delegation, and the user may overrule any of them. The same day the user decided, in discussion, the points the vocabulary and non-goals reflect: one account is one user and one character, the gateway is the trusted login system, every node runs the harness, sessions are separate while memory is shared, and continuity comes from memory and compacts. The user also decided that whoever deploys a gateway runs it, that the project's name is NL, and that the default character is 大肥鱼. On 2026-11-18 the user decided that the character reaches the user only through a message tool, which the terms Message and Working text describe, and that tools beyond a fixed core are grouped in toolsets found with tool search, with preset agents such as the tool finder. Later that day, reviewing the first desktop screens, the user decided that sessions are short-lived and archive themselves when idle, come as shared and device sessions, and dispatch tasks to each other (the Session, Shared session, Dispatch, and Task rows). Where 大肥鱼 came from, and that DeepSeek has not taken part in creating it: https://m.huxiu.com/article/4901833.html, read 2026-11-18. Legal text: https://www.cac.gov.cn/2026-04/10/c_1777558395078289.htm, read 2026-11-16. Copyright enforcement over 奶龙: court cases reported at http://js.news.cn/20240516/c9f8fb6b11174d4ea8197921dde754f0/c.html and https://www.thepaper.cn/newsDetail_forward_27181619, read 2026-11-16.

**Recheck when:** The user changes the project's purpose or lifts a non-goal, the license for the default character is settled, or the legal rules for companion AI change.
