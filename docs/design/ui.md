# UI design

**Status:** approved by the user on 2026-11-18 for Stage 1 of the [roadmap](../../.agents/plan/roadmap.md). Choices the user made explicitly are marked *(user)* with the date; the unmarked parts were the agent's proposals and were approved with the note. A change to a screen starts with a change to this note.

**Revision of 2026-11-18, after the user reviewed the first screens.** The user replaced one session per topic with short-lived shared and device sessions that archive themselves when idle and can dispatch tasks to each other (4.10 to 4.12, the sidebar in 5), asked for an integrated title bar and for several color themes, with custom themes on the desktop (3, 5, 11), and asked that the desktop window not behave like a browser (5). The details marked as proposals in those sections wait for the user's review.

**Revision of 2026-11-19.** The user chose the default avatar, a jelly-like ball (10), and two pet modes: light, the ball or an avatar made of images, and Live2D, livelier and heavier, with avatars that users add themselves, usually by asking an agent that has the `nl-avatar` skill (5, 6, 10).

**Second revision of 2026-11-19.** The user asked for a menu on each kind of control: on a session, Summarize now, Archive, Settings, Branch, and Carry on (话题续聊) in a new session from a summary; on a block, Quote and Copy, and Edit on the user's own messages, which rewinds. Every step of the loop is a checkpoint that a session can rewind to, as in pi, and the session's JSONL is only ever appended to (4.15, 4.16).

**Third revision of 2026-11-19.** The user asked for avatars made of code, the freest way to import a character, and chose to run them sandboxed (6, 10, question 17).

This note describes how every NL end looks and behaves on screen: the visual language, the conversation screen that all ends share, the screens of each end, and what those screens need from the harness and the gateway. It follows the product rules in [product-direction](../../.agents/memory/product-direction.md) and cites the rules in [architecture-invariants](../../.agents/memory/architecture-invariants.md) by id. It does not fix exact colors, sizes, or durations, which live in the design tokens (section 11), and it describes avatars only as far as the screens need them: their format is published with the `nl-avatar` agent skill ([format](../../skills/nl-avatar/references/format.md)).

## 1. Who uses what

| End | Used by | For |
|---|---|---|
| Desktop main window | The user | Chatting, watching the agent work, memory, tools, devices, usage, settings |
| Desktop pet | The user | The character on the desktop: its messages, quick replies, approvals |
| Phone | The user | Chatting, voice calls, notifications, setting up devices |
| Gateway user site | The user, in a browser | Signing up and in, account, devices, usage, export and deletion |
| Gateway admin site | The operator, whoever deploys the gateway | Provider keys, accounts, limits, compliance settings |
| Device faces | The user, at a glance | The character's state on a small screen or on LEDs |

With a self-hosted gateway, the user and the operator are the same person.

## 2. Principles

1. **Messages are the character's voice.** *(user, 2026-11-18)* The character reaches the user only through the message tool (M5). Bubbles show messages and nothing else, and the pet, notifications, and speech use messages only.
2. **The process is there when wanted.** *(user, 2026-11-18)* Working text and tool calls fill the full-width column of a conversation. The user can hide that column, and the conversation then reads like a chat app.
3. **Concise first, details one step away.** Every block starts as one line. Expanding it, or opening it in the detail panel, shows everything, down to the raw events.
4. **Honest states.** Anything running shows what it is doing, on which device, for how long, and how to stop it. A failure shows its reason.
5. **Ask in place.** Approvals appear inside the conversation, never as modal dialogs, and never block the rest of the window.
6. **Alive, never blocking** (product rule 3). Within about 300 ms of sending, the avatar's cue and an indicator show that the character is on it.
7. **A quiet interface, a lively character.** The interface is calm: neutral surfaces with one accent from the theme (section 3). Motion belongs to the character and its messages.
8. **The app speaks plainly.** Interface text is short and neutral. Only messages speak in character, and the app never writes words for the character, least of all to pull the user back (product rule 5).
9. **One event stream, many renderings.** A screen is a function of the session's events (section 13). The same events render the same way live and in a replay from JSONL (E3), on the desktop and on the phone.
10. **For everyone from the first screen.** English and Simplified Chinese, light and dark in every theme, keyboard and screen reader, reduced motion (product rule 10).

## 3. Visual language

Reference points: the reading layout of Claude's desktop app and of the DeepSeek app, where the user's text sits in a bubble and the assistant's output runs across the column; for chat view, ordinary messaging apps.

- **Color.** *(user, 2026-11-18: several color themes to choose from, and custom themes on the desktop)* Five built-in themes, each in light and dark: Sea salt, the default (cool neutrals and an azure accent, which suits the default character's blue hair without copying DeepSeek's brand color), Sakura (warm neutrals, rose), Matcha (green), Lavender (violet), and Graphite (gray, with ink as the accent). A theme sets the neutrals and the accent. The accent marks primary buttons, the selected row, focus, links, and the character's bubbles; everything else stays neutral. Red marks destructive actions and failures and nothing else. Warnings use yellow with an icon. Success stays quiet. These and the reserved hue are the same in every theme. One hue is reserved for "microphone on" (orange, as on iOS and macOS) and is used for nothing else on any end, LEDs included; no theme's accent comes within 30° of it. No red unread badges. The character's own colors (its body, its face on a device) belong to the character, not to the theme.
- **Type.** System font stacks: the platform's UI font for Latin, and PingFang SC, Microsoft YaHei, or Noto Sans CJK SC for Chinese. The system monospace font for tool input, output, and code. No bundled Chinese font, because of its size. Line height generous enough for Chinese body text; tabular numerals in usage figures.
- **Shape and depth.** Rounded rectangles from a small set of radii. Flat surfaces; shadows only on floating layers: menus, popovers, sheets, and the pet's bubbles.
- **Icons.** One permissively licensed outline icon set that the web code and Flutter can both use, or that both generate from the same SVG files, chosen with the token work. Each of the fixed tool categories has its own icon, and so do remote devices, raw MCP servers, and tasks.
- **Motion.** Interface motion is short (about 150 to 250 ms), eases out, and never bounces. Character motion is springy and never fully still (breathing, blinking) and belongs to the renderer. With reduced motion on, the interface stops animating and the character only blinks.
- **Copy.** Short, plain sentences; sentence case in English; no exclamation marks in interface text. Section 14 lists the words the interface uses.

## 4. The conversation

The conversation is the core screen. The desktop main window and the phone render the same blocks; the pet shows only messages.

### 4.1 Two views

*(user, 2026-11-18)* A conversation has two views, switched from its header:

- **Full view:** message bubbles, plus the full-width column with working text, thinking, tool calls, tasks, and markers, in the order they happened.
- **Chat view:** what a chat app shows: the user's bubbles, the character's message bubbles, approvals, and a few system tips.

Each device remembers the choice. Defaults *(user, 2026-11-18)*: full view in the desktop main window, chat view on the phone. Separately, **developer details** (off by default) add raw tool names, JSON input and output, token counts, cache hits, timings, and event ids to the full view and the detail panel.

### 4.2 Blocks

| Block | Full view | Chat view |
|---|---|---|
| User message | Bubble on the right, neutral; a quote it carries shows above its text (4.15) | Same |
| Message (the message tool) | Bubble on the left with the avatar, tinted with the pack's accent; streams | Same |
| Working text | Full-width text, slightly muted | Hidden |
| Thinking | One collapsed line, "Thought for 12 s" | Hidden |
| Tool call | One-line row (4.4) | Hidden; feeds the working indicator |
| Several tool calls in a row | One collapsed row, "Used 4 tools · Web.Search, Web.Fetch…" | Hidden |
| Approval request | Card in the conversation (4.5) | Same |
| Question (the question tool) | Card with the question and its options, Something else, Answer, and Skip (4.13) | Same |
| Dispatch | Card listing the tasks handed out, the session each went to, and its live status (4.12) | Same |
| Task received | Card where a dispatched task arrived: the task and the session it came from (4.12) | Same |
| Memory written | Thin marker "Remembered: …" with View and Undo | Gray tip, on by default (a setting) |
| Notice received | Thin marker: "Memory from Phone: …", "Digest from another session" | Hidden |
| Compact | Divider "Earlier part summarized · View summary" | Hidden |
| Versions | Thin row "‹ 2 / 2 ›" where the conversation went two ways from one checkpoint; it switches between them (4.16) | Same |
| Rewound | Marker at the end, "Rewound here", with Restore (4.16) | Same |
| Error | Row with the reason and Retry | Gray tip with Retry |
| Break reminder, crisis help | System card | Same |
| Session archived | Divider "Ended · summary saved" or "Idle for 30 min · archived", with Carry on | Same |
| Finish (the turn ends) | Hidden when accepted; a refused finish shows as a failed row with the reason | Hidden |

A turn that sends no message adds nothing to chat view: the finish tool has already recorded that the silence was deliberate (M5).

### 4.3 Message bubbles

A bubble is the message tool's dedicated rendering.

- It streams as the tool's arguments arrive (see open question 3).
- Several messages in one turn stack under one avatar, as in a chat app.
- Text supports emphasis, links, lists, inline code, and code blocks. Long or rich content widens the bubble to the column, and code blocks scroll sideways. Attachments the tool carries, such as an image or a file, render inside the bubble.
- The avatar beside a bubble shows the expression the message was sent with (section 10), when the pack has art for it.
- Model output is untrusted (T6): no raw HTML, no scripts, and no remote images. An image appears only as an attachment; an image link in the text stays a link. Links open in the system browser.

Other tools may declare a dedicated rendering too, for example an image result shown as an image, or a reminder shown as a small card. A tool without one gets a tool row.

### 4.4 Tool rows

A row reads: status icon, tool icon, the tool's display name with its key argument, a short result, duration, expand control.

- **Display name** *(user, 2026-11-18)*: `Toolset.Tool` in PascalCase with the key argument, such as `Web.Search("Shanghai weather") · 5 results` or `Docs.Read(hello.md)`. A tool that runs on another device names it in front, as in `Remote(desktop3).Docs.Read(hello.md)`, and a raw MCP tool keeps its own name behind its server, as in `MCP(github).create_issue`. Display names stay English in both languages; the expanded row adds the tool's localized description. How names are formed is in [tool-system](../../.agents/memory/tool-system.md). A row shows raw JSON only with developer details on.
- **Status:** running (animated, with Stop), done, failed (with the reason in the row), cancelled, waiting for approval, device offline. An output cut at the output threshold (M7) says so in its row.
- **Expand** shows a short preview of the input and output. **Open** puts the whole call in the detail panel: input, the full output from the session's output file (even when the model saw only part of it, M7) rendered by type (text, markdown, JSON, table, image, file), device, timings, the approval decision, and, with developer details on, the raw events. Every block can be copied.
- Three or more calls in a row with no text between them fold into one group row, which shows the current call while it runs.

### 4.5 Approvals (T7)

- The card says in plain words what the character wants to do, on which device, and why it needs approval (it deletes data, contacts someone, spends money, or acts on the physical world). The arguments are one click away.
- The choices are Allow once, Always allow (this tool on this device), Deny, and Deny with a reason, which goes back to the model.
- On risky actions no button has the default focus, so a stray Enter approves nothing.
- The turn waits; the rest of the window stays usable. When the window is not in front, the pet and a system notification say that an approval is waiting.

### 4.6 Tasks (S8)

A task runs in a session of its own and is shown through dispatch (4.12): a row of the dispatch card in the session that handed it out, and a full session, with its own tool rows and approvals, where it runs. The task card of the first draft, a sub-agent's steps nested inside the parent's conversation, is gone *(user, 2026-11-18: dispatched tasks rather than sub-agents)*.

### 4.7 Working indicator

In chat view, while a turn runs and no message is streaming, a line under the last bubble says what is happening: "Thinking…", or the current tool's localized activity text, such as "Searching the web…". A raw MCP tool, which has no activity text, shows its display name. The avatar shows the matching cue. The line appears within 300 ms of sending.

### 4.8 Composer

- Multi-line; grows with its content. Enter sends and Shift+Enter starts a new line. Enter never sends while an input method is composing (Chinese, Japanese).
- Attach by pasting, dragging, or the attach button; attachments show as chips above the text.
- A quote (4.15) shows above the text too: who wrote the quoted block, its first line, and a button that removes it.
- A microphone button; where voice works, hold to talk. The reserved hue shows while it listens.
- `/` opens the commands: new session, compact now, end session, open memory, switch view.
- While the character replies, the send button becomes Stop, and Esc stops too (P7). The user can still type and send *(user, 2026-11-18)*. By default a message sent during a turn cuts in: it shows as pending and is inserted at the turn's next step, as most harnesses do. A setting switches to queueing instead: the message waits until the turn ends and then starts the next turn.
- A small ring shows how full the context is. Near the limit it says that the conversation will be summarized automatically.

### 4.9 Header, scrolling, and screen readers

- The header holds the character's name with an "AI" tag (product rule 5) and a small avatar showing the current cue, the session's title, its kind (shared, or the device it belongs to), the session a dispatched task came from, the Accept tasks switch (4.10), the view switch, End session, and a menu with the session's actions (4.15), Export as JSONL, and developer details. On the desktop the header sits in the title bar (section 5).
- End session takes effect at once (product rule 4): the turn stops, and the session is closed, summarized, and archived. Tasks it dispatched keep running (4.12). Archive in a session's menu (4.15) does the same.
- The view stays at the bottom while content streams, unless the user has scrolled up; then a "New messages" button appears. Long transcripts are virtualized.
- Screen readers announce each finished message through a polite live region, not every streamed token.

### 4.10 Shared and device sessions

*(user, 2026-11-18)* Sessions are short-lived. The user does not keep one session per topic and come back to it; a session does what it was asked and then archives itself (4.11). There are two kinds:

- **Device sessions** belong to one device. They run there and use that device's own tools directly, and that device's main window, pet, or speaker talks to them.
- **Shared sessions** belong to the account rather than to one device: every device lists them and can open them and talk into them. Where a shared session runs, and how the other devices see it, is open question 10.

*(user, 2026-11-18)* Every session has a switch, **Accept tasks**, that says whether other sessions may dispatch tasks to it (4.12). Proposal: on by default, so that dispatching works from the start; the user turns it off for a session that should stay on its own subject.

### 4.11 Idle sessions archive themselves

*(user, 2026-11-18)* A session that has been idle for a while closes itself: it is summarized (S5) and moves to the archive. Idle means no running turn, no running task, and no waiting approval. Proposal: after 30 minutes by default, set in Settings (10 minutes, 30 minutes, 1 hour, 2 hours). The sidebar shows the countdown on an idle session ("Idle · archives in 12 min"), and anything sent to the session resets it.

The archive lists the summaries (the compacts folder, S3), newest first, with the session's kind, its device, and when it was archived. A summary opens read-only, as the transcript where this device has it, or as the summary card where it does not; Carry on starts a new session from it (S5).

### 4.12 Dispatching tasks

*(user, 2026-11-18)* The user can tell one session many things at once. The harness splits them into tasks and gives each one to a session that accepts tasks and suits it, such as the device session on the device that has the right tools, or starts new sessions for the rest; what it can do quickly itself, it keeps. Unlike a sub-agent, a dispatched task belongs to the session that runs it: it keeps running when the dispatching session is ended or archived, and it reports to the user from its own session, and to the dispatching session too while that is still open.

- The **dispatch card** in the dispatching session lists each task in a row: its short title, the session it went to (marked New when the harness started that session), the session's device, and a live status: queued, running, waiting for an answer, waiting for approval, waiting for the device, done, or failed. A row opens its session. The card's header counts the tasks by status, and its footer says that the tasks carry on in their own sessions if this one closes.
- A session that **receives a task** shows it as a card where it arrived: the task in the dispatcher's words, and the session it came from, as a link, or marked archived. The work and the result that follow read like any other turn.
- How the harness matches tasks to sessions, and whether dispatching is a core tool or a toolset (M6), is open question 11.

### 4.13 Questions

*(user, 2026-11-19: the character can ask the user a question, as harnesses commonly do)* When the character needs the user to decide something before it goes on, it asks with the question tool, a core tool like message and finish (M5, M6), and the turn waits for the answer.

- A question is the question in the character's words, a few options, each with an optional line of detail, and whether the user may pick one or several. The user can always answer in their own words under Something else, or Skip; the character then goes on as it sees fit.
- It is asked in place, as a card in the conversation, never as a modal (principle 5), and it stays in chat view. Nothing is picked at first and no button takes the default focus, so a stray Enter answers nothing.
- While a question waits, what the user sends from the composer is the answer, and the composer says so ("Answer Dafeiyu"); the message also appears as the user's bubble.
- Once answered or skipped, the card shows the answer and nothing more can be picked.
- A waiting question shows wherever the session's state shows: the sidebar's status line, "Waiting for your answer"; the row of a dispatched task; the avatar (section 10). Proposal: the pet and notifications announce it as they announce an approval.

### 4.14 When NL is not in front

*(user, 2026-11-19)* A message the character sends (the message tool, M5) while the user is not looking at NL also reaches them outside the window:

- **Desktop.** While the main window does not have the focus, because another app is in front or the window is minimized or hidden, the message also shows in a bubble beside the pet when the pet is shown (section 6), and as a system notification when it is not.
- **Phone.** While the app is in the background, the message shows in a bubble beside the floating pet when the user has turned it on, and as a system notification otherwise. Only Android can show a floating pet; on iOS messages in the background are notifications.
- Notifications go through each system's own notification service. They are on by default, and the user can turn them off in Settings, for instance not to be disturbed; the pet's bubbles still show. A notification has the character's name as its title and the start of the message as its text.
- Proposal: only the messages of this device's own sessions and of shared sessions count, so that another device's session reaches the user through that device and nothing is announced twice.

### 4.15 Menus

*(user, 2026-11-19: each kind of control has its own right-click menu)* A right click, the menu key, or Shift+F10 on a session or a block opens that thing's menu; on the phone a long press opens the same actions as a sheet (section 7). The menus are Radix context menus (section 12), usable from the keyboard and with a screen reader, and they take the place of the browser's menu (section 5).

**A session**, from its sidebar row and from the header's menu (4.9):

- **Branch** *(user)*: starts a new session of the same kind, on the same device, that holds this session's conversation as it is now, so that one line of thought can go two ways. Its record starts with a copy of this session's (4.16), so its first request repeats a prompt the provider has just seen and hits the prefix cache. The two sessions then go on separately.
- **Carry on** *(user: 话题续聊)*: starts a new session from a summary of this one, with the summary at its top and a link back, so that the topic goes on with a short context. A live session is summarized now, as a fork (M4); an archived one uses its summary from the archive (S5). The old session stays as it is: a live one goes on, and archives itself when idle.
- **Summarize now** *(user)*: compacts the session at once (S5); a divider marks the place (4.2). Unavailable while a turn runs or waits for an approval, an answer, or its device.
- **Settings** *(user)*: a dialog with the session's title and its Accept tasks switch (4.10). Renaming lives here.
- **Archive** *(user)*: the same as End session (4.9).

An archived session, in the archive or open read-only, offers Carry on only.

**A block**:

- **Copy** *(user)*: the selected text within the block, or the whole block when nothing in it is selected. A tool row copies its input and output.
- **Quote** *(user)*, on messages, the user's messages, and working text: puts the block above the composer as a quote (4.8). The message sent next carries it: its bubble shows the quote above the text, and the model receives it as quoted text before the message.
- **Edit** *(user)*, on the user's own messages: the bubble becomes an editor in place, with Cancel and Send. Send rewinds to before the message and sends the new text from there (4.16); the earlier version stays and can be shown again.
- **Rewind to before this** *(user)*, on messages, the user's messages, working text, thinking, and tool rows: returns the session to the checkpoint before the block (4.16).

Rewinding and editing stop a running turn first (P7). In an archived session, blocks offer Copy only. Cards (approvals, questions, dispatch, received tasks) and markers keep their own buttons and have no menu.

### 4.16 Checkpoints and rewinding

*(user, 2026-11-19)* Every step of the loop is a checkpoint, as in pi: the user's message, and each response of the model together with the results of its tool calls. The user can rewind to before any of them, a tool call included, rather than only to before their own messages, which is all Claude Code and Codex allow. The prompt at a checkpoint is one that was sent before, so a rewind soon after hits the provider's prefix cache (M2). The session's JSONL is only ever appended to: a rewind adds a line and removes none (S2).

- **Rewound.** The conversation ends at the checkpoint, and what came after leaves the view but stays in the record. A marker at the end says "Rewound here. What came after is kept, and what tools did is not undone", with Restore, which goes back to the newest point after the checkpoint. What the user sends next continues from the checkpoint. Only steps are checkpoints, so a block in the middle of a step, such as the second of two tool calls one response made, rewinds to before its whole step.
- **Versions.** Where the conversation went two ways from one checkpoint, a thin row before the first block that differs reads "‹ 2 / 2 ›" and switches between the ways, in both views. Switching moves the session the way a rewind does, and adds a line too.
- **The world is not rewound.** Files written, messages sent to others, things bought, devices moved, memory written, and tasks dispatched stay as they are, and dispatched tasks keep running in their own sessions (4.12). Proposal: when the steps left behind changed something, the harness appends a notice after the checkpoint that lists those calls, so that the model does not act on a world it no longer remembers (open question 16).

## 5. Desktop main window

The layout is a title bar, a sidebar, the open session, and a detail panel that opens when needed and can be pinned.

The **title bar** *(user, 2026-11-18: make the title bar part of the window)*. On Windows the page draws the title bar but the system keeps drawing the caption buttons, so that Snap Layouts, the system menu, double-click to maximize, dragging to the screen edges, and resizing from every edge stay native. Over the sidebar the bar holds the sidebar toggle and New session; over the session it holds the session's header (4.9). The bar is as tall as the caption buttons and at least 32 px, so that its controls fit when Windows shrinks a maximized window's buttons, and the color behind the buttons follows the theme, custom themes included (documented for Windows 11, and measured there). Where Windows refuses to color it, as Windows 10 is expected to, the bar takes the system's caption color instead: white, or black in dark mode. On macOS the page draws under the traffic lights (the Overlay title bar style, not yet tried on a Mac). On Linux the window manager's title bar stays, and the page's bar becomes the first row below it.

The **sidebar** *(user, 2026-11-18)* holds search, the live sessions, and, at the bottom, Archive, Memory, Tools, Devices, Usage, and Settings. New session sits in the title bar; it starts a shared session, and its menu offers a device session on this device instead. The live sessions are in two groups:

- **Shared:** the account's shared sessions.
- **Devices:** this device first, then the others, each with its sessions; the sessions of an offline device are dimmed.

Each row shows the title and one status line: what the session is doing, that it waits for approval, for an answer (4.13), or for its device, or that it is idle, with the archive countdown. A session running a dispatched task names the session it came from. A row's menu holds the session's actions (4.15).

**A window, not a browser.** *(user, 2026-11-18: mind the webview's F5 and F12)* The webview's browser keys are off: F5 and Ctrl+R (reload, which would drop the window's state), Ctrl+P (print), Ctrl+F (find), Ctrl+plus and Ctrl+minus (zoom), Alt+Left and Alt+Right (history), and F12 and Ctrl+Shift+I (developer tools, which release builds do not include anyway). Keys the app uses itself still reach it. The browser's context menu appears only in text fields and on selected text outside the app's own menus; sessions and blocks have menus of their own (4.15), whose Copy takes the selected text. The webview never leaves the app's own pages; links in messages will open in the system browser. Swiping back and pinch zoom stay off, as Tauri sets them. *(user, 2026-11-19: F5, F12, and the right-click menu still worked in the development build)* Development builds behave the same, so that what a developer tries is what users get; one started with `NL_DEV_BROWSER_KEYS=1` keeps reload, the developer tools, and the browser's menu, for debugging.

The screens:

1. **First run and sign-in.** Choose a language; enter the gateway address, typed or filled in from the operator's invite link or QR code; sign in or sign up, as the gateway allows (the method comes from the trust design); name this device; meet the character: that it is an AI (product rule 5), what the gateway stores and who can read it (T1), and how to see and delete memory; optionally allow the microphone and notifications and turn on the pet and start at login; the first session opens with the character's first message.
2. **Session** (section 4).
3. **Archive** (4.11). An archived session of this device opens read-only from its JSONL. Carry on starts a new session from its summary (S5). On the same device the old transcript stays visible above a "Carried on from summary" divider; on another device the summary appears as a card at the top.
4. **Character.** The large avatar, the name, a short persona summary from the pack, and the installed packs. Switching packs changes look, voice, and persona; memory stays the same. Packs are imported as data only (T8). The behavior arrives in Stage 6; Stage 1 builds the shell.
5. **Memory.** The memory files as a list headed by the index file. Each entry shows its text, when and on which device it was written, and its source: said by the user, inferred by the character, or returned by a tool (T10). Edit, delete, search, filter (recent, urgent, by source), and export everything. Summaries appear as a read-only folder. A quiet indicator shows while memory is being organized.
6. **Tools.** Toolsets grouped by source: built-in, installed NL toolsets, MCP servers (added by command or URL, shown as `MCP(name)`, with their status), and toolsets offered by other devices. For each toolset and tool: on or off, and ask every time, always allow, or never. Also which of this device's toolsets others may use. The behavior arrives in Stage 5.
7. **Devices.** Every device of the account with its type, name, online state or last seen time, version, capabilities, and live sessions. Rename, remove (takes effect at once, T2), and add a device. Each enrollment is announced on the other devices (T2), with "Not you? Remove".
8. **Usage.** Tokens in and out, cache hit rate, requests, and cost where the operator has set prices, per day, per device, and per kind of work (conversation, memory forks, tasks, voice), against the operator's limits (E7).
9. **Settings.** Account: sign out, export all data, delete the account. Languages: the interface language, and the language the character replies in. Appearance: the theme, with a preview of each, light, dark, or the system's choice, a custom theme on top (section 11), default view, developer details, memory tips in chat view. Sessions: how long an idle session waits before it archives itself (4.11). Messages sent while the character works: cut in at its next step (the default) or wait until the turn ends. Notifications: messages that arrive while NL is in the background, on by default (4.14), and quiet hours; the limit on proactive contact; microphone and voice; the pet: show it; its mode and the avatar chosen for each mode, with the avatars folder, Open folder, Reload, and the command that adds the `nl-avatar` skill to an agent (section 6); its size, start at login, click-through; break reminders; minors' mode, when the operator offers it; about: version, licenses, and the gateway with its operator's terms.
10. **Detail panel.** A tool call, a task, a memory entry, a summary, or an approval's full arguments.

Every action is reachable from the keyboard, with shortcuts for new session, search, stop (Esc), switch view, and focus the composer.

## 6. Desktop pet

- **Two modes** *(user, 2026-11-19)*, chosen in Settings. **Light** shows the ball (section 10) or an avatar of the user's own: one made of images, such as animated GIFs, numbered frames, or a sprite sheet, which costs little, or one made of code, which costs what its code costs; an avatar that has both shows its code. **Live2D** shows an avatar's Live2D model, which is livelier and costs more memory and graphics power. Each mode remembers its own avatar. When the chosen avatar cannot show, because it is missing or broken, because no Live2D runtime is available (question 13), or because it failed to load, the pet shows the same avatar's light-mode look (its code, then its images), then the ball; it never shows nothing.
- **Avatars** are folders in the app's avatars folder, each with an `avatar.json` that maps the cues (section 10) to its art. Users add them themselves, most easily by asking an agent such as Claude Code or Codex that has the `nl-avatar` skill, which converts the art, checks the result, and installs it ([avatars](../avatars.md)). Settings shows who made each avatar and on what terms, and tags it Light, Code, or Live2D.
- **Code avatars** *(user, 2026-11-19: importing code is the freest way, and it runs sandboxed)*: a page of the avatar's own, with its scripts, draws the character any way it likes. It runs in a sandboxed frame that reaches nothing but its own files (T8): no network, no storage, no access to the pet's page or NL's functions. The frame takes no pointer events, so the pet keeps dragging, its menu, and double click, and sends the page the cues as messages: the state, the expression, the pointer, where the pointer is, and each gesture. The frame stays hidden until the page says it is ready; a page that does not say so within 10 seconds counts as broken. What the sandbox cannot stop is in question 17.
- The window shows the character and nothing else. Messages that arrive while the main window is not in front (4.14) appear as bubbles beside it and fade after a time that grows with their length; hovering keeps them. A long message ends with "Open in window", and a click on a bubble opens the main window.
- A click opens a one-line input beside the pet. What is sent goes to this device's most recently active session, or a new device session if none is live, so the pet and the main window show the same session.
- While the character works, a short line beside it says what it is doing, and its cue matches.
- An approval shows as a small card with Allow once, Deny, and Details, which opens the main window. Always allow is offered only in the main window.
- The reserved hue shows beside the pet whenever the microphone is open (product rule 8).
- Drag to move; the position is remembered per screen. Transparent pixels pass clicks through.
- The right-click menu and the tray menu offer: open the main window, mute the microphone, quiet for an hour, hide the pet, settings, quit. *(user, 2026-11-19: right click opens the menu, which closes the pet; a double click is too easy to do by accident to close anything, so it is a shortcut to something fun that never does harm)* A double click plays: the ball jumps for joy, and an avatar pack bounces with a happy face.
- NL keeps running while one of its windows is shown. Closing the main window hides it while the pet is shown, so that the pet's menu can open it again, and quits NL otherwise; closing the pet hides it, and brings back the main window if that was hidden too. Whether the pet is shown is a setting (section 5, Settings), on by default.
- Pointing at the pet, pressing it, and dragging it are cues as well (hover, press, drag), and a Live2D avatar's gaze follows the pointer.
- Cue states: section 10.

## 7. Phone

- Tabs: Chat, Memory, Devices, Me. The session list is a drawer in Chat, the detail panel is a bottom sheet, and Me holds usage and settings.
- Chat renders section 4, with chat view as the default. The composer adds hold-to-talk and a call button.
- **Call.** The character full screen; captions of what it says (its messages); a live transcript of what the user says; the reserved hue and "Listening" while the microphone is open; mute, end call, and switch to text. Speaking or tapping interrupts. The behavior belongs to the voice track (V1); Stage 1 builds the shell.
- **Notifications** carry only messages, approvals, and enrollment alerts. Messages that arrive while the app is in the background become notifications unless the floating pet shows them (4.14); notifications are on by default and can be turned off. They respect quiet hours and can hide their content on the lock screen. The app never sends a notification it made up, such as "Your character misses you".
- **Device setup.** Put the device in pairing mode (its face shows it); find it over Bluetooth; choose a Wi-Fi network; the device joins the account and gets a name; it greets the user. Errors: not found, wrong Wi-Fi password, joining failed. Stage 1 uses a fake Bluetooth layer.
- A long press on a session or a block opens its actions (4.15) as a bottom sheet.
- The phone is a node like any other, but the system may stop its background work. When it hands work to another device (S8), the tool row or task card says where the work runs.

## 8. Gateway sites

*(user, 2026-11-18)* The gateway serves two web sites on two ports, so that an operator can bind each to its own domain: a user site and an admin site. Both are built from the same design tokens and React components as the desktop windows and are embedded in the gateway binary, so they add no deployable component (E4). Like every listener, both bind to loopback unless the operator configures otherwise (T5); the separate port also lets an operator keep the admin site on an internal network.

**User site**, for everyone with an account on the gateway:

- Sign up, as the sign-up policy allows, and sign in, by the method the trust design chooses.
- Account: profile, sign-out, export all data, delete the account.
- Devices: the account's devices, renaming, removal, and enrollment announcements.
- Usage: the same figures as the apps' usage screen, against the operator's limits.
- The operator's terms, privacy policy, and AI disclosure.

The desktop app shows the same account screens from the same components, and the phone has Flutter versions of them. Proposal: the API that nodes use is served on the user site's port, under its own path.

**Admin site**, for the operator:

- **First-run setup** of a new gateway: create the operator account, add the DeepSeek key, and choose the sign-up policy (open, invite only, or closed).
- **Overview:** version, health of PostgreSQL and Redis, number of accounts, usage.
- **Provider keys** (T3): add, rotate, delete. A saved key is never shown again.
- **Accounts:** invite, disable, delete.
- **Limits:** defaults and per-account overrides.
- **Compliance:** the break reminder interval, whether minors' mode is offered, crisis resources per locale, the AI disclosure text, and links to the terms and the privacy policy.

The admin site shows no conversation or memory content. The user site offers memory only inside the data export.

## 9. Device faces

Device faces are simulated in `web/stage` for review and for golden tests.

| State | Small screen | LEDs |
|---|---|---|
| Idle | Eyes, blinking at random intervals | Slow, dim breathing in the accent |
| Listening | Wide eyes and a ring in the reserved hue | Reserved hue, steady |
| Thinking, working | Eyes glancing aside, three dots | Accent, slow pulse |
| Speaking | Eyes and a mouth bar that follows the audio level | Accent, following the audio level |
| Expressions | One eye shape per expression | None |
| Waiting for approval | Wide, hopeful eyes looking up, an exclamation mark | Accent, double blink |
| Waiting for an answer | Head tilted, one eye narrowed, a question mark | Accent, slow wave |
| Sleeping (quiet hours) | Closed eyes | Off or very dim |
| Offline | Dimmed eyes and a no-connection glyph | Slow, dim blink |
| Pairing | The pairing code, if the trust design uses one | Accent, fast blink |
| Error | Eyes as crosses and a short code | Red, blinking |

## 10. Cues

Cues are semantic (P8). The initial set:

- **States**, derived from harness events rather than chosen by the model: idle, listening, thinking, working, speaking, waiting for approval, waiting for an answer, waiting for a device, sleeping, offline, error.
- **Expressions**, chosen by the model: neutral, happy, excited, sad, worried, surprised, shy, pouting. Proposal for Stage 3: the message tool carries an optional expression, so that a message and its face arrive together.
- **Gestures**, chosen by the model: nod, shake head, wave, tilt head, bounce.

Each surface renders what it can: an avatar on the pet, in the main window, and on the phone; eyes on a small screen; color and rhythm on LEDs. *(user, 2026-11-19: a ball, bouncy like jelly, lively, flat and 2D, with two upright eyes that do more than blink, livelier colors, and a look of its own for each state)* The default avatar is a jelly-like ball in bright sea blue, flat and 2D: a darker rim, a glossy highlight, pink cheeks, and two white upright bars for eyes, which turn into ^ ^ when it smiles and > < when it is squished. It is never still, and every state looks different:

| State | The ball |
|---|---|
| Idle | Breathes; blinks with a squish, sometimes twice; looks around, leaning with its gaze; settles like jelly; smiles with ^ ^ eyes, rosy cheeks, and a sparkle; winks |
| Working | Hops without a pause, squashed as it lands and stretched as it pushes off, squinting on every landing |
| Waiting for approval | Bobs as if knocking, with hopeful wide eyes and a pulsing "!" bubble |
| Waiting for an answer | Tilts its head from side to side, one eye narrowed, with a swaying "?" bubble |
| Waiting for a device | Dozes: eyes shut, dimmed, breathing slowly, with a "z" bubble |
| Listening | Wide eyes, small nods, and a steady ring in the reserved hue |
| Pointed at | Squishes with > < eyes and springs back, wobbling |

Avatars side by side never move in step. With reduced motion the ball keeps still: its eyes, cheeks, and bubbles still show the state, and a still ring in the accent shows that it works. Its eyes double as the small-screen device face (section 9). Its colors are the `character` tokens, the same in every theme. Each app draws it itself, so it needs no avatar pack and no renderer.

*(user, 2026-11-19)* Users can choose other avatars (section 6), which `web/stage` draws, or, for a code avatar, runs in a sandbox. An avatar maps each cue to its own art; a code avatar hears the cues and draws them itself. A state without art of its own falls back along a fixed chain: thinking to working, waiting for approval and waiting for an answer to each other, waiting for a device and offline to sleeping, and every chain ends at idle, which every avatar must have. Character packs (Stage 6) bring an avatar of their own, such as 大肥鱼's art once it is licensed (product rule 9).

## 11. Design tokens and theming

- One source file, `design/tokens.json`, in the format of the W3C Design Tokens Community Group. Read the current version of that format before writing the generator (E8).
- A small generator (`web/tokens`) writes CSS custom properties for the web code (the desktop windows, `web/stage`, the gateway's two sites), TypeScript constants for code that draws or times things in script, and Dart tokens for `apps/client`; when the device track starts, Rust constants for the device faces come from the same source. *(user, 2026-11-18)* The generated files are build outputs and are never committed: every build step that uses them runs the generator first (the web packages' scripts, `pnpm install`, and the Flutter jobs in CI and in the release workflow), so a change to the source reaches every platform by building and cannot be forgotten. Flutter builds therefore need Node, which runs the generator without installing the workspace.
- Groups: color (neutrals, ink, semantic colors, the reserved microphone hue, the accent), typography, spacing on a 4 px grid, radius, elevation, motion (interface durations and easings; character springs live in the renderer), layout breakpoints, and the character's colors.
- **Themes.** The `theme` group holds each built-in theme in light and dark (`theme.sea.light`, `theme.sea.dark`, …), and the generator refuses a theme or mode whose tokens differ from the first one's; every other group is the same in all themes. The first theme is the default. The tests hold every theme and mode to the contrast rules and keep every accent 30° from the reserved hue. In CSS the default theme applies to the root; `data-theme` on any element picks a theme for it and its descendants and `data-mode` picks light or dark, and without `data-mode` the system's preference applies. The app sets both on the root from the user's choice, and the theme previews in Settings set them on their swatches. Every generated rule has zero specificity (`:where()`), so a custom theme overrides tokens with ordinary selectors; only reduced motion is `!important`, so that a theme cannot turn animation back on.
- **Custom themes (desktop).** A custom theme is a CSS file in the app's themes folder, applied on top of the chosen built-in theme. It sets `--nl-*` properties: on `:root` for both modes, and on `:root[data-mode="dark"]` for dark only. Settings lists the files, applies one, reloads it after an edit, and opens the folder. The tokens are the supported interface; the app's class names are internal and change between releases. The content-security policy keeps a theme from loading fonts or images from the network, and files over 256 KiB are refused (T6).
- A character pack colors the character, not the interface: its body, its face, and the LEDs of a device (section 9) use the pack's colors; on a device "accent" means the character's color. A pack's colors are checked for contrast and for distance from the reserved hue, with a fallback.
- The colors once hard-coded in `apps/desktop/index.html` and the Flutter app's seed color come from the tokens, and so do the ball's (section 10); the orange disc that `web/stage` once drew is gone.

## 12. How it is built

- **Framework** *(user, 2026-11-18; reserved decision 5)*: React with TypeScript for the desktop windows and the gateway's two sites, which share one component package (proposal: `web/ui`), CSS Modules over the token variables, and Radix primitives for menus, popovers, dialogs, and tooltips, which are accessible by default. The reason is that it is the most widely known stack, so the cheaper models that will build most of NL write it most reliably ([tech-choice-criteria](../../.agents/memory/tech-choice-criteria.md)). The phone uses Flutter widgets themed entirely from the tokens, not stock Material looks.
- **Interfaces with fakes** (E2). Every screen reads from and acts on an interface. The conversation source plays scripted event streams: a plain chat, a turn with tool calls, an approval, a task, an error, a very long conversation, each in both languages. A fake gateway client serves the account, devices, usage, memory files, and summaries, and a fake setup layer stands in for Bluetooth. A later stage swaps a fake for the real thing without touching the screen.
- **Gallery.** A development-only page in each app shows every screen in every state, in both languages, in light and dark, and in every theme. CI captures it headless (Playwright for the web code, golden tests for Flutter) and runs automated accessibility checks on the web code. The screenshots are what the user reviews.
- **Order of work:** tokens, cues, and the default avatar; the conversation screen as the pattern; the rest of the main window; the pet; the phone; the gateway's two sites; the device faces.

## 13. Needs list

What the screens need from the harness and the gateway. The design note of the stage named settles each item.

**Harness events** (Stage 3 unless noted): turn started and ended (done, stopped, failed); working text and thinking deltas; tool call started (id, tool, display summary), input deltas, progress, result, failure, cancellation; message started, deltas, and finished, with its expression and attachments; finish accepted or refused; approval requested and resolved; question asked (its text, options, and whether several may be picked), answered, and skipped; user message queued and accepted; context usage; compact started and finished; the session moved to another checkpoint: a rewind, an edit, or another version shown (4.16); session idle (with the time it archives), ended, and archived. Stage 4: memory written (path, summary, source, device), notice received, organizing started and finished. Stage 5: tasks dispatched (each task's title and target session, and whether the session is new), a task's status changing, a task received, a task's result reported.

**Harness commands:** send a user message with attachments, cutting in at the next step or queued until the turn ends, or answering the question that waits; stop; answer an approval; answer or skip a question; start a shared or a device session; end a session; compact now; rename a session; set whether a session accepts tasks; set the idle time; carry on from a summary, an archived session's or one made now from a live session, and branch a session (4.15); send a message with a quote; rewind to before a block, edit a user message (a rewind and a send), and show another version where the conversation forks (4.16); list the live sessions of every device, with their kind, device, status, and idle deadline; list the archive; open an archived session read-only; route the pet's input to this device's current session.

**Tool display metadata**, from the toolset manifest ([tool-system](../../.agents/memory/tool-system.md)), with defaults for raw MCP tools: display name, key argument, localized description and activity text, category, the risk hints that decide approvals, and an optional dedicated rendering. A remote tool's display name comes from its node's toolset, as in `Remote(desktop3).Files.Read`.

**Gateway** (Stage 2 unless noted): sign-in, the sign-up policy, session state; the device list with presence, renaming, removal, enrollment, and enrollment announcements; usage per day, device, and kind of work, with limits; operator calls for keys, accounts, limits, and compliance settings. Stage 4: memory files with source, device, time, and version; editing, deleting, undoing the last write, and export; the summaries folder with metadata (device, time, title, preview).

**Local to each device:** view, theme, and language preferences, custom theme files, whether messages become notifications, whether the pet is shown, its mode and the avatar chosen for each mode, installed avatars, window and pet positions.

## 14. Words in the interface

The internal terms in the [vocabulary](../../.agents/memory/product-direction.md#vocabulary) appear in the interface as these words:

| Term | English UI | zh-CN UI |
|---|---|---|
| Session | Session *(user, 2026-11-18)* | 会话 |
| Shared session, device session | Shared session, device session | 共享会话、设备会话 |
| Dispatching a task | Dispatch | 分派 |
| The question tool's call | Question; the character "asks" | 提问；“想问你” |
| Compact | Summary | 摘要 |
| The compacts folder | Archive | 归档 |
| Starting a session from a summary | Carry on | 话题续聊 *(user, 2026-11-19)* |
| Returning to a checkpoint | Rewind | 回退 |
| A new session that starts as a copy of another | Branch | 分支 |
| The ways a conversation went from one checkpoint | Version | 版本 |
| Node | Device | 设备 |
| Message | Message | 消息 |
| Memory | Memory | 记忆 |
| Task | Task | 任务 |
| Character pack | Character | 角色 |
| Avatar: an avatar pack, or the built-in ball | Avatar | 形象 |
| The pet's two modes | Light, Live2D | 轻量、Live2D |
| Vault | Keys | 密钥 |
| Gateway | Gateway | 网关 |
| Full view and chat view | The "Show work" switch | “显示过程”开关 |

Notices, forks, checkpoints, and working text have no name in the interface; it describes what they did.

## 15. Open questions

1. How sign-in and enrollment work, and whether pairing uses a code (trust design, before Stage 2).
2. Settled on 2026-11-18: the harness tool system, described in [tool-system](../../.agents/memory/tool-system.md) (rule M6). The Stage 3 and Stage 5 design notes settle what it still marks as proposals.
3. Whether DeepSeek streams tool-call arguments. If it does not, a message appears whole when its call completes, and the working indicator covers the wait (provider-cache spike, before Stage 3).
4. Who writes conversation titles, and when (Stage 3).
5. How the gateway knows the live sessions of every device, for the sidebar (Stage 4).
6. Whether a message can be addressed to another device, for example from a routine on a server to the phone (Stage 5, proactive contact).
7. Where MCP servers' own credentials are kept (Stage 5).
8. Settled on 2026-11-19: the pet's two modes and the avatars users add (sections 6 and 10), in the format published with the `nl-avatar` skill. Character packs (Stage 6) build on it.
9. Whether the user site should also offer chat in a browser. That would make the browser a new kind of node, and a new end is the user's decision.
10. **For the user:** where a shared session runs (an always-on node such as a server, the node that started it, or the gateway), and how the other devices show it and send to it. Showing a session on a device other than the one that runs it is what the non-goal "a whole interactive session hosted on a remote node" and S2 rule out today, so shared sessions need the user to lift or narrow that non-goal.
11. How the harness matches tasks to sessions; whether dispatching is a core tool or a toolset (M6); how a result reaches the dispatching session (as a notice, S4) and the user once the dispatcher is archived; and the limits on how many sessions one dispatch may start, and on what they may spend (E7). The Stage 5 design note settles these.
12. The default idle time before a session archives itself, and whether a task waiting for an offline device keeps its session open indefinitely.
13. **For the user:** whether and how released builds show Live2D. An app that loads any model is a Live2D "Expandable Application": it needs Live2D's approval and a contract before release, and Live2D does not, as a rule, approve one that is entirely free. The Live2D runtime is never shipped with NL, and until this is settled released builds accept none, so a Live2D avatar shows its light-mode look, or the ball.
14. Whether the app gets an import of its own, for a folder or a zip, beside the agent skill.
15. Whether the main window's avatars, in the header and beside bubbles, follow the avatar chosen for the pet, and in which mode.
16. What a rewind does about what it leaves behind (4.16): the notice to the model proposed there, whether some changes, such as those NL's own file tools made, should be undone as well, and whether notices that arrived after the checkpoint (urgent memory, digests, S4) are appended again after a rewind (Stage 3 and Stage 4 design notes).
17. **For the user:** whether to close the last gap in the code-avatar sandbox (section 6). A frame the avatar points at an address it may not load is blocked before any request is sent, but WebView2, like Chrome and Edge, first resolves the address's name and opens a connection to it: a slow, one-way way to signal out (the name can carry data to whoever runs its DNS). No content-security policy or browser setting stops it; the network layer can: the pet window in a WebView2 environment of its own behind a proxy that refuses everything, at the cost of another browser process and of the storage the pet now shares with the main window. Until then the user docs say so, and advise installing code avatars only from people the user trusts.
