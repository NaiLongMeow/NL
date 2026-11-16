# Distributed design (under discussion)

How sessions and memory stay in step across nodes. The user called this the core problem and the core feature of NL on 2026-11-16 and is discussing it with the agent before it is fixed.

Until the records are rewritten, the section "Settled by the user" overrides [architecture-invariants](../memory/architecture-invariants.md), [product-direction](../memory/product-direction.md), and the [roadmap](roadmap.md) wherever they disagree. When the discussion closes: rewrite those three from this file, correct docs/architecture.md and the READMEs, and delete this file.

## Settled by the user (2026-11-16)

1. **The gateway is trusted.** It is the login system, holds the keys, calls the models, and may store and order every account's sessions and memory. The first draft treated it as unable to read content; the user asked why it would be untrusted, and that assumption is dropped. End-to-end encryption against the gateway, ciphertext-only relaying, and device-approved key handover are not requirements.
2. **One account is one user and one character.** Accounts are completely isolated and must never be mixed up; that is what signing in is for.
3. **Every node runs the harness, the ESP32 included.** A node whose own abilities are limited can use remote tools. The first draft's single host with thin bodies is dropped, and so are "a phone never runs the loop" and "an ESP32 only does audio".
4. **Sessions are separate; memory is synchronized.** A conversation is continuous and can be carried on from another node, and the character can also split: several sessions may run at the same time. What is separate is the sessions; the memory is one.
5. **Session data is stored as JSONL.**
6. **Urgent memory** is synchronized at once by the harness on its own initiative and is injected into the harness running on other nodes. It is a message to the harness, not a notification to the user.
7. **Normal memory** is organized when a conversation completes, by something like a forked agent: the fork reuses the whole context so that it hits the cache, runs in parallel without stopping the main agent from chatting, only one organizing fork runs at a time, and when it finishes its core content is merged back into the main agent.
8. **Prefix caching is important.**
9. **Prompts are English**: every prompt, system prompt, and injected message. As in Claude Code's prompts, the system prompt states which language the character replies in. Prompt design learns from Claude's.
10. **References:** the gateway learns from sub2api and similar gateways, the harness from other harnesses; everything is written in Rust. DeepSeek is the provider the design is built for first.

## Design as it stands (the agent's proposal on top of the settled points)

- **State belongs to the account, not to a node.** Sessions and memory are one record per account, stored and ordered by the gateway (PostgreSQL for the record, Redis for presence, fan-out, and leases). Every node keeps a local replica as JSONL and is replaceable; a small node keeps less and reads the rest from the gateway.
- **The gateway orders everything.** Keys live in the gateway, so a node converses only while connected to it and never produces turns offline. Nodes therefore never merge divergent histories, and no CRDT is needed.
- **One writer per session at a time**, under a lease. Carrying a session on from another node is a lease handover. JSONL lines carry parent ids, so that a session can fork (the character splitting) and so that lines stranded by a crash survive as a side branch.
- **Memory is a stream of events** (add, update, retire) that every node replays into the same state. An urgent event is fanned out at once; a running harness appends it to its running sessions as a notice at the next step.
- **The prompt is a function of the log, and its prefix never changes.** Order: system prompt, tool definitions, the memory snapshot taken when the session started (written into the log), the conversation, then appended notices. Nothing is edited in place. Any node rebuilds the same prefix for the same session.
- **Forks reuse the parent's prefix.** The organizing fork is the parent's prompt plus one appended instruction, with memory-writing tools only. It writes memory events, hands a short digest back to the main session as an appended notice, and keeps its own lines in a side log. A watermark per session records how far organizing has got.
- **Two planes.** State (sessions, memory, notices) goes through the gateway. What is left between nodes is mainly one node calling a tool that lives on another.

## Open questions put to the user (third round)

1. Tools and the cache: a session carried on from a node with different tools would change the prefix. Proposal: the same system prompt and the same small built-in tool set on every node; MCP and remote tools stay out of the prefix and are announced in appended messages and called through one generic tool; a tool the node lacks runs remotely.
2. Carrying on a session another node is using right now: take it over, or fork automatically?
3. What "a conversation completes" means for triggering the organizing fork: each finished reply, or a pause in the conversation? Proposal: a pause, a close, a handover, or enough unorganized material, tracked by the watermark.
4. Do other running sessions learn of normal memory once it is organized (as a digest at their next turn), or only sessions that start later?
5. With every node talking mostly to the gateway, is direct node-to-node connection still wanted early, or can remote tool calls go through the gateway first and direct routes come last?

## Not yet examined

How DeepSeek's prefix cache behaves (minimum length, lifetime, scope per key). If the gateway pools upstream keys, a session probably has to stay on one key to keep hitting the cache.
