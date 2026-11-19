# Plan: context menus, checkpoints, and rewinding

**Status:** in progress since 2026-11-19. Delete this file when the work is done and its decisions are in memory, the UI design note, and the roadmap. Runs before step 4 (code avatars) of [pet-messages-code-avatars](pet-messages-code-avatars.md).

## What the user asked (2026-11-19)

> 在不同控件中需要有不同的右键效果，会话则可以压缩、归档、设置等，还能分支、话题续聊（相当于压缩后开一个新会话，压缩后的内容在新会话开头，方便继续话题）。消息条则可以引用、复制等，如果是用户消息，则额外有修改功能，相当于rewind回退到检查点。检查点参考pi，设计为每句一个检查点，即每次loop都有检查点，优势是短时间内rewind能完全吃到缓存命中，并且可以随时回退到出问题的消息前，哪怕这是一条工具调用的消息。而不像claude code和codex一样只能在用户发消息作为检查点回退。JSONL始终为追加，不要因为回退功能而加入删除内容的逻辑，其他harness都是追加JSONL的逻辑，

The user's decisions in it: per-control context menus; session actions (compact, archive, settings, branch, continue the topic from a summary in a new session); message actions (quote, copy; edit on the user's own messages, which rewinds); a checkpoint at every loop step, as in pi, so that a rewind can return to before any message, a tool call's included, and hits the prefix cache when done soon; the JSONL stays append-only, and rewinding never deletes. This changes M2 (the prompt may return to an earlier checkpoint) and S2 (the record is append-only), which are reserved decisions 4 and 9, decided by the user.

## What pi does (read 2026-11-19 from badlogic/pi-mono, MIT: packages/coding-agent/docs/session-format.md, sessions.md)

Each JSONL entry has `id`, `parentId`, and `timestamp`; entries form a tree; the leaf is the current position. `/tree` moves within the file (a user message goes back into the editor; another entry continues after it), `/fork` and `/clone` start a new session file whose header names the parent session. Compaction appends an entry with `summary` and `firstKeptEntryId`; leaving a branch can append a `branch_summary`. Nothing is deleted. pi's docs do not say how the leaf is chosen when a file is loaded; NL appends a head record instead (below).

## The agent's design (proposals; the user reviews them)

- **Record:** every line has an id and its parent; the head is where the next line attaches. A rewind appends a head record pointing at the checkpoint; nothing is removed. Checkpoints are the points between loop steps (a model response with all its tool results), so the prompt at a checkpoint is one that was sent before; rewinding to before a block goes to the checkpoint before its step.
- **Edit** a user message: in place, in the bubble; Send appends the new message under the checkpoint before the old one. **Versions:** where the path forks, a row switches between versions (‹ 1/2 ›). **Rewound:** a marker at the end says the later part is kept (Restore) and that what tools did is not undone.
- **Side effects:** a rewind moves the conversation, not the world. Proposal for Stage 3: a notice tells the model which actions on the abandoned part changed something.
- **Branch:** a new session whose record starts with a copy of this one's path, so its first request hits the cache. **Carry on (话题续聊):** a new session that starts from a summary; for a live session the summary is made now as a fork (M4). The source session stays as it is.
- **Menus:** Radix context menus (ui.md section 12), one set of session actions shared by the sidebar row's context menu and the header's menu; message menus on bubbles, working text, thinking, and tool rows. Settings opens a dialog with the title and Accept tasks; Rename folds into it. Archive in a menu is End session.
- Words: the UI keeps "Summary/摘要" for compacts (section 14); 接着聊 becomes 话题续聊, the user's word; rewind 回退, branch 分支, quote 引用, edit 修改.

## Steps

1. [ ] Design: ui.md (revision line; 4.2 blocks; new 4.15 menus and 4.16 rewinding; 4.8 quote; 4.9 header menu; 5 sidebar; 7 phone long-press; 13 commands; 14 words; 15 open questions), architecture-invariants (S2, M2, M3, evidence), distributed-design, product-direction vocabulary (Checkpoint, Rewind, Branch), roadmap Stage 3 build and exit.
2. [ ] Fake source: an append-only line tree per session with head records; rewind, edit, versions, branch, carry on from a live session, compact now, rename; tests.
3. [ ] UI: ContextMenu component, session menu (sidebar, header, archive), message menus, quote chip and quoted bubble, inline edit, versions row, rewound marker, settings dialog; i18n; tests.
4. [ ] Check in the real app (menus, edit, rewind, restore, versions, branch, carry on); commit; push; CI.
