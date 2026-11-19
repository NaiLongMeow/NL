---
name: distributed-design
description: Recall before designing or changing anything about sessions (shared, per device, idle archiving, dispatched tasks, checkpoints, rewinding, branches), the session JSONL, memory, compaction, notices, forks, the shared file system, or one node using another node's abilities. This is NL's core feature.
metadata:
  type: project
  scope: The harness on every node and the gateway services behind it
  status: active
  last_verified: 2026-11-19
---

Execution is distributed and memory is central. Every node runs the harness and its own sessions. One shared file system per account, reached through the gateway, holds the memory and the compacts. A conversation is carried from one node to another by memory and a compact, never by copying the transcript. The binding rules are S1 to S9 and M1 to M4 in [[architecture-invariants]]; this entry explains how the parts work together and what was rejected.

## What lives where

| Thing | Where | How it moves |
|---|---|---|
| Harness loop, sessions, tools, devices | On each node; a node can run several sessions at once | It does not move |
| Session JSONL, append-only | On the node that ran the session | Not synchronized; it leaves the node only by deliberate upload |
| Memory | Files in the account's shared file system | Urgent: pushed at once and injected. Normal: organized at a pause, then a digest at the next turn |
| Compacts | A read-only folder in the shared file system | Uploaded when a session closes; made by the gateway if the node vanished |
| The last request of each session | The gateway | Kept automatically as requests pass through the model proxy |
| Node capabilities | On each node, listed at the gateway | Called remotely as a tool call or as a task |

## The flows

- **Urgent memory.** During a turn the harness decides that something cannot wait and writes it to the shared file system at once. The gateway pushes it to every running node, and each harness appends it as a notice to its running sessions at the next step. The notice is addressed to the harness, not shown to the user as a notification.
- **Normal memory.** When a stretch of conversation stops, a separate judgment decides whether anything needs remembering: a dedicated decision model, or one extra DeepSeek call. The judgment is written to the JSONL as a record and never enters the history. If memory is needed, an organizing fork runs beside the main agent, writes the memory files, and hands its core content back to the main agent as a notice. Only one organizing fork runs at a time. Other running sessions, on any node, receive a digest at their next turn.
- **Compact.** A session is compacted when it reaches the context limit, so that it can go on, and automatically when it is closed. The compact made at close is uploaded to the read-only folder. If a node goes away without closing a session, the gateway takes the last request it kept for that session, appends the compact prompt, and stores the result, so nothing depends on the node coming back.
- **Carrying on elsewhere.** Another node starts a session from an uploaded compact plus the shared memory. The original session stays on its node; the two are then separate sessions of the same character.
- **Looking back.** The compacts folder is the archive of past conversations. The harness can search it and read from it.
- **Remote capabilities.** A node that is short of something calls a remote node, in one of two sizes: a tool call, answered at once, or a task, which the remote node runs as a sub-agent in a session of its own and answers with a result. Calls go through the gateway first; direct routes between nodes are an optimization added last.

Three kinds of fork reuse a session's whole prompt and add one instruction, so that they hit the provider's prefix cache: the memory judgment, the organizing fork, and the compact. The gateway's fallback compact works the same way on the request it kept.

## Sessions are short-lived, shared or per device, and dispatch tasks

The user's design of 2026-11-18, given after reviewing the first desktop screens, which listed one conversation per topic in the manner of other harnesses:

- **Short-lived.** A session leans toward one use: when it has been idle for a while it compacts and archives itself, so the user never manages a list of topics. This is the close of S5, triggered by idleness.
- **Two kinds.** Shared sessions and device sessions.
- **Accept tasks.** Each session has a setting for whether tasks may be dispatched to it.
- **Dispatch.** The user can tell one session dozens of things at once. The harness in that session finds the matching sessions, or starts a few new ones, and hands the tasks out. Unlike a sub-agent, which depends on its parent, a dispatched task keeps running in its session after the dispatching session has closed.

The agent's reading, not yet confirmed by the user, and how [docs/design/ui.md](../../docs/design/ui.md) (4.10 to 4.12) draws it: a device session belongs to one device, runs there, and has that device's tools at hand; a shared session belongs to the account, and every device lists it and can open it. Idle means no running turn, task, or approval. A task reports to the user from its own session, and to the dispatcher while that is open. The S8 task, a remote sub-agent nested in its parent, becomes a task dispatched to a session.

**How to apply:** Design session lists, routing, and tasks around these four points. Do not reintroduce long-lived per-topic sessions or sub-agents that die with their parent for user-facing work.

**Why:** The user's reasons, given on 2026-11-16. The gateway is the login system and already sees every request, so there is no reason to treat it as untrusted, and it can compact a session on its own. A session JSONL holds a great deal besides the conversation and is only a record, so it is not worth synchronizing. Nodes differ in hardware, not in kind: every node runs the harness, and weak hardware or a phone whose background work gets killed borrows from a remote node. One user has one character, and accounts must never mix.

**How to apply:** Put a new piece of state in the right row of the table before designing it: local to a session, or shared through the file system. Never make one node depend on another node's transcript. Anything a session needs from elsewhere arrives as a file in the shared file system or as an appended notice.

## Checkpoints, rewinding, and branches

The user's design of 2026-11-19, given with the menus on each control ([docs/design/ui.md](../../docs/design/ui.md), 4.15 and 4.16):

- **A checkpoint at every step.** As in pi, every step of the loop is a checkpoint, not only the user's messages, which is all Claude Code and Codex offer. The user can rewind to before any message, a tool call included. A checkpoint's prompt was already sent, so a rewind made soon after hits the prefix cache.
- **Append-only.** The JSONL is only ever appended to, as other harnesses' records are; rewinding adds lines and deletes none.
- **Edit** a user message: rewind to the checkpoint before it and send the new text.
- **Branch** a session, and **carry on** (话题续聊): a new session from this one's conversation, or from a summary of it, which carries the topic on with a short context.

The agent's design, a proposal that the Stage 3 design note settles:

- Every line has an id and names the line it follows, so the lines form a tree, as pi's entries do (`id`, `parentId`, read 2026-11-19). The head, where the next line attaches, is the last line appended, or the checkpoint named by the last head record, a line that only moves the head. A rewind, and showing another version, append a head record; an edit appends the new message under the checkpoint before the old one. The history (M3) is the path from the first line to the head.
- A checkpoint is a line that ends a step: a user message, a notice, or the last tool result of a model response. Rewinding to before a block goes to the checkpoint before its step, so a model response is never cut in half.
- A branch is a new session whose JSONL begins with a copy of the source's path to its head, and whose first line names the source and the checkpoint. It copies rather than refers, so that each record stands alone (S2, E3), and it runs on the same node. Its first request equals the source's last, so it hits the cache while it stays on the same provider key (open points below).
- Carrying on from a live session makes the summary as a fork (M4) and starts a session from it, as carrying on from an uploaded compact does; the source session is left as it is.
- A branch is not a fork: a fork (M4) is a side run the harness starts, with one appended instruction, that hands back its core content; a branch is a session the user starts, which goes on as its own.

**Why:** The user's reasons: going back to just before the step that went wrong, even a tool call, is what makes rewinding useful; a checkpoint's prompt was already sent, so a rewind soon after costs little; and an append-only record never loses what happened.

**How to apply:** Never delete or rewrite a JSONL line, for rewinding or anything else. Build the prompt from the path to the head. Give every new kind of line a parent. A rewind moves the conversation, not the world: what tools did stays done (ui.md 4.16 and open question 16).

## Rejected

- A single host that owns the character, with other ends as thin bodies (the agent's first draft). The user wants every node to run the harness.
- Hiding content from the gateway: end-to-end encryption between nodes, ciphertext-only relaying, key handover approved by an existing device. The gateway is trusted.
- Replicating session JSONL through the gateway, with gateway-ordered lines and a writer lease per session (the agent's second proposal). JSONL is a local record.
- CRDTs or merging of divergent histories. A node converses only while connected to the gateway.
- A whole interactive session running on a remote node with the local node as its screen. Tool calls and tasks are enough.

## Open points

These are the agent's assumptions, not user decisions. Settle them in the design note of the stage that builds them.

- The authoritative copy of the shared file system is kept on the gateway's side, and nodes fetch and cache files as needed.
- The gateway's fallback compact fires when a session's node has gone offline, or the session has been silent for a long time, without a close.
- Two writers to one memory file are resolved by a version check: the later writer re-reads and retries.
- A session starts with a snapshot of core memory (an index file and the files it names), in the manner of Claude Code's memory files.
- How DeepSeek's prefix cache behaves (minimum length, lifetime, scope per key) has not been checked. If the gateway pools upstream keys, a session probably has to stay on one key to keep hitting the cache.
- Where a shared session runs and how other devices show it. Every device opening one session conflicts with S2 and with the non-goal "a whole interactive session hosted on a remote node", which only the user can lift (ui.md open question 10).
- How dispatch matches tasks to sessions, whether it is a core tool (M6) or a toolset, how results travel (likely notices, S4), and its spending limits (E7) (ui.md open question 11).
- The format of head records and of a branch's first line; whether the model is told, by a notice, what the steps a rewind left behind changed; whether notices received after a checkpoint are appended again after a rewind (ui.md open question 16); and where a branch of a shared session runs (open question 10).

**Evidence:** Discussion with the user over four rounds, 2026-11-16; every item under "What lives where", "The flows", and "Rejected" follows a user statement in that discussion. The section on short-lived sessions follows the user's message of 2026-11-18 reviewing the first desktop screens. The section on checkpoints follows the user's message of 2026-11-19 asking for menus on each control; pi's session format was read the same day in badlogic/pi-mono (MIT), packages/coding-agent/docs/session-format.md and sessions.md.

**Recheck when:** A stage's design note settles an open point or the session record's format, DeepSeek's caching turns out to work differently, the user changes what is synchronized, or the user confirms or corrects the reading of shared sessions and dispatch.
