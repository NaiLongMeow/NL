# UI design

**Status:** draft, waiting for the user's approval (Stage 1 of the [roadmap](../../.agents/plan/roadmap.md)). Choices the user made are marked *(user)* with the date. Everything else is the agent's proposal and can change in review.

This note describes how every NL end looks and behaves on screen: the visual language, the conversation screen that all ends share, the screens of each end, and what those screens need from the harness and the gateway. It follows the product rules in [product-direction](../../.agents/memory/product-direction.md) and cites the rules in [architecture-invariants](../../.agents/memory/architecture-invariants.md) by id. It does not fix exact colors, sizes, or durations, which live in the design tokens (section 11), and it says nothing about avatar formats, which are chosen in Stage 6 (P8).

## 1. Who uses what

| End | Used by | For |
|---|---|---|
| Desktop main window | The user | Chatting, watching the agent work, memory, tools, devices, usage, settings |
| Desktop pet | The user | The character on the desktop: its messages, quick replies, approvals |
| Phone | The user | Chatting, voice calls, notifications, setting up devices |
| Gateway console | The operator, whoever deploys the gateway | Provider keys, accounts, limits, compliance settings |
| Device faces | The user, at a glance | The character's state on a small screen or on LEDs |

With a self-hosted gateway, the user and the operator are the same person.

## 2. Principles

1. **Messages are the character's voice.** *(user, 2026-11-18)* The character reaches the user only through the message tool (M5). Bubbles show messages and nothing else, and the pet, notifications, and speech use messages only.
2. **The process is there when wanted.** *(user, 2026-11-18)* Working text and tool calls fill the full-width column of a conversation. The user can hide that column, and the conversation then reads like a chat app.
3. **Concise first, details one step away.** Every block starts as one line. Expanding it, or opening it in the detail panel, shows everything, down to the raw events.
4. **Honest states.** Anything running shows what it is doing, on which device, for how long, and how to stop it. A failure shows its reason.
5. **Ask in place.** Approvals appear inside the conversation, never as modal dialogs, and never block the rest of the window.
6. **Alive, never blocking** (product rule 3). Within about 300 ms of sending, the avatar's cue and an indicator show that the character is on it.
7. **A quiet interface, a lively character.** The interface is calm and neutral. Color and motion belong to the character and its messages.
8. **The app speaks plainly.** Interface text is short and neutral. Only messages speak in character, and the app never writes words for the character, least of all to pull the user back (product rule 5).
9. **One event stream, many renderings.** A screen is a function of the session's events (section 13). The same events render the same way live and in a replay from JSONL (E3), on the desktop and on the phone.
10. **For everyone from the first screen.** English and Simplified Chinese, light and dark themes, keyboard and screen reader, reduced motion (product rule 10).

## 3. Visual language

Reference points: the reading layout of Claude's desktop app and of the DeepSeek app, where the user's text sits in a bubble and the assistant's output runs across the column; for chat view, ordinary messaging apps.

- **Color.** Warm neutral surfaces and ink-colored text, in a light and a dark theme. One accent per character pack, applied at run time; the placeholder uses a deep-sea blue, which suits the default character's blue hair without copying DeepSeek's brand color. Red marks destructive actions and failures and nothing else. Warnings use yellow with an icon. Success stays quiet. One hue is reserved for "microphone on" (orange, as on iOS and macOS) and is used for nothing else on any end, LEDs included. A pack accent that is too close to the reserved hue, or lacks contrast, is replaced by a fallback. No red unread badges.
- **Type.** System font stacks: the platform's UI font for Latin, and PingFang SC, Microsoft YaHei, or Noto Sans CJK SC for Chinese. The system monospace font for tool input, output, and code. No bundled Chinese font, because of its size. Line height generous enough for Chinese body text; tabular numerals in usage figures.
- **Shape and depth.** Rounded rectangles from a small set of radii. Flat surfaces; shadows only on floating layers: menus, popovers, sheets, and the pet's bubbles.
- **Icons.** One permissively licensed outline icon set that the web code and Flutter can both use, or that both generate from the same SVG files, chosen with the token work. Each tool category has its own icon: search, web page, file, memory, device, remote device, MCP server, task, message.
- **Motion.** Interface motion is short (about 150 to 250 ms), eases out, and never bounces. Character motion is springy and never fully still (breathing, blinking) and belongs to the renderer. With reduced motion on, the interface stops animating and the character only blinks.
- **Copy.** Short, plain sentences; sentence case in English; no exclamation marks in interface text. Section 14 lists the words the interface uses.

## 4. The conversation

The conversation is the core screen. The desktop main window and the phone render the same blocks; the pet shows only messages.

### 4.1 Two views

*(user, 2026-11-18)* A conversation has two views, switched from its header:

- **Full view:** message bubbles, plus the full-width column with working text, thinking, tool calls, tasks, and markers, in the order they happened.
- **Chat view:** what a chat app shows: the user's bubbles, the character's message bubbles, approvals, and a few system tips.

Each device remembers the choice. Proposed defaults: full view in the desktop main window, chat view on the phone. Separately, **developer details** (off by default) add raw tool names, JSON input and output, token counts, cache hits, timings, and event ids to the full view and the detail panel.

### 4.2 Blocks

| Block | Full view | Chat view |
|---|---|---|
| User message | Bubble on the right, neutral | Same |
| Message (the message tool) | Bubble on the left with the avatar, tinted with the pack's accent; streams | Same |
| Working text | Full-width text, slightly muted | Hidden |
| Thinking | One collapsed line, "Thought for 12 s" | Hidden |
| Tool call | One-line row (4.4) | Hidden; feeds the working indicator |
| Several tool calls in a row | One collapsed row, "Used 4 tools · weather, web page…" | Hidden |
| Approval request | Card in the conversation (4.5) | Same |
| Task | Card (4.6) | Hidden; feeds the working indicator |
| Memory written | Thin marker "Remembered: …" with View and Undo | Gray tip, on by default (a setting) |
| Notice received | Thin marker: "Memory from Phone: …", "Digest from another conversation" | Hidden |
| Compact | Divider "Earlier part summarized · View summary" | Hidden |
| Error | Row with the reason and Retry | Gray tip with Retry |
| Break reminder, crisis help | System card | Same |
| Conversation ended | Divider "Ended · summary saved" with Carry on | Same |
| A turn that sent no message | Nothing extra | Gray tip "No message this time · Show work" |

### 4.3 Message bubbles

A bubble is the message tool's dedicated rendering.

- It streams as the tool's arguments arrive (see open question 3).
- Several messages in one turn stack under one avatar, as in a chat app.
- Text supports emphasis, links, lists, inline code, and code blocks. Long or rich content widens the bubble to the column, and code blocks scroll sideways. Attachments the tool carries, such as an image or a file, render inside the bubble.
- The avatar beside a bubble shows the expression the message was sent with (section 10), when the pack has art for it.
- Model output is untrusted (T6): no raw HTML, no scripts, and no remote images. An image appears only as an attachment; an image link in the text stays a link. Links open in the system browser.

Other tools may declare a dedicated rendering too, for example an image result shown as an image, or a reminder shown as a small card. A tool without one gets a tool row.

### 4.4 Tool rows

A row reads: status icon, tool icon, summary, device (when it is not this one), duration, expand control.

- **Summary:** a short verb phrase in the user's language, such as "Searched the web for "Shanghai weather" · 5 results" or "Read museum.sh.cn". Built-in tools have localized templates; MCP tools use the title and main argument from the server's metadata. A row shows raw JSON only with developer details on.
- **Status:** running (animated, with Stop), done, failed (with the reason in the row), cancelled, waiting for approval, device offline.
- **Expand** shows a short preview of the input and output. **Open** puts the whole call in the detail panel: input, output rendered by type (text, markdown, JSON, table, image, file), device, timings, the approval decision, and, with developer details on, the raw events. Every block can be copied.
- Three or more calls in a row with no text between them fold into one group row, which shows the current call while it runs.

### 4.5 Approvals (T7)

- The card says in plain words what the character wants to do, on which device, and why it needs approval (it deletes data, contacts someone, spends money, or acts on the physical world). The arguments are one click away.
- The choices are Allow once, Always allow (this tool on this device), Deny, and Deny with a reason, which goes back to the model.
- On risky actions no button has the default focus, so a stray Enter approves nothing.
- The turn waits; the rest of the window stays usable. When the window is not in front, the pet and a system notification say that an approval is waiting.

### 4.6 Tasks (S8)

A task card shows the task's title, the device running it, a live line with its latest step, the elapsed time, and Stop. Expanded, it lists the task's steps as tool rows, one level deep; anything deeper opens in the detail panel. When the task finishes, the card shows a preview of its result.

### 4.7 Working indicator

In chat view, while a turn runs and no message is streaming, a line under the last bubble says what is happening, taken from the current block: "Thinking…", "Searching the web…", "Waiting for Home server…". The avatar shows the matching cue. The line appears within 300 ms of sending.

### 4.8 Composer

- Multi-line; grows with its content. Enter sends and Shift+Enter starts a new line. Enter never sends while an input method is composing (Chinese, Japanese).
- Attach by pasting, dragging, or the attach button; attachments show as chips above the text.
- A microphone button; where voice works, hold to talk. The reserved hue shows while it listens.
- `/` opens the commands: new conversation, compact now, end conversation, open memory, switch view.
- While the character replies, the send button becomes Stop, and Esc stops too (P7). The user can still type and send: a message sent during a turn shows as pending and is handed to the character at its next step. (The agent's proposal; the alternative is that sending interrupts the turn.)
- A small ring shows how full the context is. Near the limit it says that the conversation will be summarized automatically.

### 4.9 Header, scrolling, and screen readers

- The header holds the character's name with an "AI" tag (product rule 5) and a small avatar showing the current cue, the conversation's title, the device it runs on, the view switch, End conversation, and a menu: rename, compact now, export as JSONL, developer details.
- End conversation takes effect at once (product rule 4): the turn stops, and the conversation is closed and summarized.
- The view stays at the bottom while content streams, unless the user has scrolled up; then a "New messages" button appears. Long transcripts are virtualized.
- Screen readers announce each finished message through a polite live region, not every streamed token.

## 5. Desktop main window

The layout is a sidebar, the conversation, and a detail panel that opens when needed and can be pinned.

The **sidebar** holds New conversation, the conversation list, search, and, at the bottom, Memory, Tools, Devices, Usage, and Settings. The list has three groups:

- **Running:** conversations open on this device, with an activity dot.
- **Carry on:** summaries saved by any device, newest first, with the device and the time.
- **Recent:** closed conversations of this device.

The screens:

1. **First run and sign-in.** Choose a language; enter the gateway address, typed or filled in from the operator's invite link or QR code; sign in or sign up, as the gateway allows (the method comes from the trust design); name this device; meet the character: that it is an AI (product rule 5), what the gateway stores and who can read it (T1), and how to see and delete memory; optionally allow the microphone and notifications and turn on the pet and start at login; the first conversation opens with the character's first message.
2. **Conversation** (section 4).
3. **Past conversations.** A closed conversation of this device opens read-only from its JSONL. Carry on starts a new session from its summary (S5). On the same device the old transcript stays visible above a "Carried on from summary" divider; on another device the summary appears as a card at the top.
4. **Character.** The large avatar, the name, a short persona summary from the pack, and the installed packs. Switching packs changes look, voice, and persona; memory stays the same. Packs are imported as data only (T8). The behavior arrives in Stage 6; Stage 1 builds the shell.
5. **Memory.** The memory files as a list headed by the index file. Each entry shows its text, when and on which device it was written, and its source: said by the user, inferred by the character, or returned by a tool (T10). Edit, delete, search, filter (recent, urgent, by source), and export everything. Summaries appear as a read-only folder. A quiet indicator shows while memory is being organized.
6. **Tools.** Built-in tools; MCP servers, added by command or URL, with their status and tools; tools offered by other devices, grouped by device. For each tool: on or off, and ask every time, always allow, or never. Also which capabilities of this device others may use. The behavior arrives in Stage 5.
7. **Devices.** Every device of the account with its type, name, online state or last seen time, version, capabilities, and open conversations. Rename, remove (takes effect at once, T2), and add a device. Each enrollment is announced on the other devices (T2), with "Not you? Remove".
8. **Usage.** Tokens in and out, cache hit rate, requests, and cost where the operator has set prices, per day, per device, and per kind of work (conversation, memory forks, tasks, voice), against the operator's limits (E7).
9. **Settings.** Account: sign out, export all data, delete the account. Languages: the interface language, and the language the character replies in. Appearance: theme, default view, developer details, memory tips in chat view. Notifications and quiet hours; the limit on proactive contact; microphone and voice; the pet: show it, its size, start at login, click-through; break reminders; minors' mode, when the operator offers it; about: version, licenses, and the gateway with its operator's terms.
10. **Detail panel.** A tool call, a task, a memory entry, a summary, or an approval's full arguments.

Every action is reachable from the keyboard, with shortcuts for new conversation, search, stop (Esc), switch view, and focus the composer.

## 6. Desktop pet

- The window shows the character and nothing else. Messages appear as bubbles beside it and fade after a time that grows with their length; hovering keeps them. A long message ends with "Open in window".
- A click opens a one-line input beside the pet. What is sent goes to the most recently active conversation on this device, or a new one if none is open, so the pet and the main window show the same conversation.
- While the character works, a short line beside it says what it is doing, and its cue matches.
- An approval shows as a small card with Allow once, Deny, and Details, which opens the main window. Always allow is offered only in the main window.
- The reserved hue shows beside the pet whenever the microphone is open (product rule 8).
- Drag to move; the position is remembered per screen. Transparent pixels pass clicks through.
- The right-click menu and the tray menu offer: open the main window, mute the microphone, quiet for an hour, hide the pet, settings, quit.
- Cue states: section 10.

## 7. Phone

- Tabs: Chat, Memory, Devices, Me. The conversation list is a drawer in Chat, the detail panel is a bottom sheet, and Me holds usage and settings.
- Chat renders section 4, with chat view as the default. The composer adds hold-to-talk and a call button.
- **Call.** The character full screen; captions of what it says (its messages); a live transcript of what the user says; the reserved hue and "Listening" while the microphone is open; mute, end call, and switch to text. Speaking or tapping interrupts. The behavior belongs to the voice track (V1); Stage 1 builds the shell.
- **Notifications** carry only messages, approvals, and enrollment alerts. They respect quiet hours and can hide their content on the lock screen. The app never sends a notification it made up, such as "Your character misses you".
- **Device setup.** Put the device in pairing mode (its face shows it); find it over Bluetooth; choose a Wi-Fi network; the device joins the account and gets a name; it greets the user. Errors: not found, wrong Wi-Fi password, joining failed. Stage 1 uses a fake Bluetooth layer.
- The phone is a node like any other, but the system may stop its background work. When it hands work to another device (S8), the tool row or task card says where the work runs.

## 8. Gateway console

The account screens every user needs (sign-in, devices, usage, export, and deletion) live in the apps. The gateway serves a small web console for the operator, built like the desktop UI and embedded in the gateway binary, so it adds no deployable component (E4):

- **First-run setup** of a new gateway: create the operator account, add the DeepSeek key, and choose the sign-up policy (open, invite only, or closed).
- **Overview:** version, health of PostgreSQL and Redis, number of accounts, usage.
- **Provider keys** (T3): add, rotate, delete. A saved key is never shown again.
- **Accounts:** invite, disable, delete.
- **Limits:** defaults and per-account overrides.
- **Compliance:** the break reminder interval, whether minors' mode is offered, crisis resources per locale, the AI disclosure text, and links to the terms and the privacy policy.

The console shows no conversation or memory content.

## 9. Device faces

Device faces are simulated in `web/stage` for review and for golden tests.

| State | Small screen | LEDs |
|---|---|---|
| Idle | Eyes, blinking at random intervals | Slow, dim breathing in the accent |
| Listening | Wide eyes and a ring in the reserved hue | Reserved hue, steady |
| Thinking, working | Eyes glancing aside, three dots | Accent, slow pulse |
| Speaking | Eyes and a mouth bar that follows the audio level | Accent, following the audio level |
| Expressions | One eye shape per expression | None |
| Waiting for approval | Eyes looking up, a question mark | Accent, double blink |
| Sleeping (quiet hours) | Closed eyes | Off or very dim |
| Offline | Dimmed eyes and a no-connection glyph | Slow, dim blink |
| Pairing | The pairing code, if the trust design uses one | Accent, fast blink |
| Error | Eyes as crosses and a short code | Red, blinking |

## 10. Cues

Cues are semantic (P8). The initial set:

- **States**, derived from harness events rather than chosen by the model: idle, listening, thinking, working, speaking, waiting, sleeping, offline, error.
- **Expressions**, chosen by the model: neutral, happy, excited, sad, worried, surprised, shy, pouting. Proposal for Stage 3: the message tool carries an optional expression, so that a message and its face arrive together.
- **Gestures**, chosen by the model: nod, shake head, wave, tilt head, bounce.

Each surface renders what it can: the pack's art on the pet, in the main window, and on the phone; eyes on a small screen; color and rhythm on LEDs. The placeholder character is drawn for the lowest fidelity first, as a simple round body with two eyes, so that its face doubles as the small-screen device face. It replaces the orange "NL" disc that `web/stage` draws today. The default character, 大肥鱼, replaces the placeholder once its art is licensed (product rule 9).

## 11. Design tokens and theming

- One source file, `design/tokens.json`, in the format of the W3C Design Tokens Community Group. Read the current version of that format before writing the generator (E8).
- A small generator writes CSS custom properties for the web code (the desktop windows, `web/stage`, the console), a Dart theme for `apps/client`, and, when the device track starts, Rust constants for the device faces. The generated files are committed, and CI fails when they are stale, so that Flutter and firmware builds do not need Node.
- Groups: color (neutrals, ink, semantic colors, the reserved microphone hue, the accent slot), typography, spacing on a 4 px grid, radius, elevation, motion (interface durations and easings; character springs live in the renderer), and layout breakpoints.
- The accent slot is filled at run time from the character pack, checked for contrast and for distance from the reserved hue, with a fallback.
- The colors now hard-coded in `apps/desktop/index.html`, `web/stage/src/stage.ts`, and the Flutter seed color move into the tokens.

## 12. How it is built

- **Framework** (reserved decision 5, needs the user's approval): React with TypeScript for the desktop windows and the console, CSS Modules over the token variables, and Radix primitives for menus, popovers, dialogs, and tooltips, which are accessible by default. The reason is that it is the most widely known stack, so the cheaper models that will build most of NL write it most reliably ([tech-choice-criteria](../../.agents/memory/tech-choice-criteria.md)). The phone uses Flutter widgets themed entirely from the tokens, not stock Material looks.
- **Interfaces with fakes** (E2). Every screen reads from and acts on an interface. The conversation source plays scripted event streams: a plain chat, a turn with tool calls, an approval, a task, an error, a very long conversation, each in both languages. A fake gateway client serves the account, devices, usage, memory files, and summaries, and a fake setup layer stands in for Bluetooth. A later stage swaps a fake for the real thing without touching the screen.
- **Gallery.** A development-only page in each app shows every screen in every state, in both languages and both themes. CI captures it headless (Playwright for the web code, golden tests for Flutter) and runs automated accessibility checks on the web code. The screenshots are what the user reviews.
- **Order of work:** tokens, cues, and the placeholder character; the conversation screen as the pattern; the rest of the main window; the pet; the phone; the console; the device faces.

## 13. Needs list

What the screens need from the harness and the gateway. The design note of the stage named settles each item.

**Harness events** (Stage 3 unless noted): turn started and ended (done, stopped, failed); working text and thinking deltas; tool call started (id, tool, display summary), input deltas, progress, result, failure, cancellation; message started, deltas, and finished, with its expression and attachments; approval requested and resolved; user message queued and accepted; context usage; compact started and finished; session ended. Stage 4: memory written (path, summary, source, device), notice received, organizing started and finished. Stage 5: task started, step, progress, finished.

**Harness commands:** send a user message with attachments; stop; answer an approval; end a session; compact now; carry on from a summary; list sessions; open a closed session read-only; route the pet's input to the current conversation.

**Tool display metadata:** a title, a localized summary template for built-in tools, a category icon, the risk hints that decide approvals (for MCP tools, from the server's tool annotations), and an optional dedicated rendering.

**Gateway** (Stage 2 unless noted): sign-in, the sign-up policy, session state; the device list with presence, renaming, removal, enrollment, and enrollment announcements; usage per day, device, and kind of work, with limits; operator calls for keys, accounts, limits, and compliance settings. Stage 4: memory files with source, device, time, and version; editing, deleting, undoing the last write, and export; the summaries folder with metadata (device, time, title, preview).

**Local to each device:** view and theme preferences, window and pet positions.

## 14. Words in the interface

The internal terms in the [vocabulary](../../.agents/memory/product-direction.md#vocabulary) appear in the interface as these words:

| Term | English UI | zh-CN UI |
|---|---|---|
| Session | Conversation | 对话 |
| Compact | Summary | 摘要 |
| Node | Device | 设备 |
| Message | Message | 消息 |
| Memory | Memory | 记忆 |
| Task | Task | 任务 |
| Character pack | Character | 角色 |
| Vault | Keys | 密钥 |
| Gateway | Gateway | 网关 |
| Full view and chat view | The "Show work" switch | “显示过程”开关 |

Notices, forks, and working text have no name in the interface; it describes what they did.

## 15. Open questions

1. How sign-in and enrollment work, and whether pairing uses a code (trust design, before Stage 2).
2. What the harness does when a turn ends without a message (Stage 3).
3. Whether DeepSeek streams tool-call arguments. If it does not, a message appears whole when its call completes, and the working indicator covers the wait (provider-cache spike, before Stage 3).
4. Who writes conversation titles, and when (Stage 3).
5. Whether the gateway knows which devices have conversations open, for presence in the sidebar (Stage 4).
6. Whether a message can be addressed to another device, for example from a routine on a server to the phone (Stage 5, proactive contact).
7. Where MCP servers' own credentials are kept (Stage 5).
8. Avatar formats (Stage 6, P8).
