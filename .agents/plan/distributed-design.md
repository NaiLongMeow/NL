# Distributed design (under discussion)

How one character stays the same across nodes. The user called this the core problem and the core feature of NL on 2026-11-16 and is discussing it with the agent before it is fixed.

Until the records are rewritten, the section "Settled by the user" overrides [architecture-invariants](../memory/architecture-invariants.md), [product-direction](../memory/product-direction.md), and the [roadmap](roadmap.md) wherever they disagree. When the discussion closes: rewrite those three from this file, correct docs/architecture.md and the READMEs, and delete this file.

## Settled by the user (2026-11-16)

1. **The gateway is trusted.** It is the login system, holds the keys, and calls the models. The first draft treated it as unable to read content; the user asked why it would be untrusted, and that assumption is dropped. End-to-end encryption against the gateway, ciphertext-only relaying, and device-approved key handover are not requirements.
2. **One account is one user and one character.** Accounts are completely isolated and must never be mixed up; that is what signing in is for.
3. **Every node runs the harness, the ESP32 included.** The first draft's single host with thin bodies is dropped, and so are "a phone never runs the loop" and "an ESP32 only does audio".
4. **A node can run several sessions at once.** The limit that matters is hardware. Weak hardware, and phones whose background work gets killed, call the capabilities of remote nodes.
5. **Sessions are separate; memory is synchronized.** A conversation is continuous and can be carried on elsewhere, and the character can also split: several sessions may run at the same time.
6. **Session JSONL is a local record.** It belongs to the node that ran the session, holds much more than the conversation (tool output, decision records, and the like), and is not synchronized. It leaves the node only when someone deliberately uploads it.
7. **Urgent memory** is synchronized at once by the harness on its own initiative and is injected into the harness running on other nodes. It is a message to the harness, not a notification to the user.
8. **Normal memory** is organized when a stretch of conversation stops. Whether memory is needed at that moment is judged separately, for example by a dedicated decision model or by one extra DeepSeek call. That judgment is written to the JSONL as a record only and never enters the history messages.
9. **Organizing runs as a fork.** The fork reuses the whole context so that it hits the cache, runs in parallel without stopping the main agent from chatting, only one organizing fork runs at a time, and when it finishes its core content is merged back into the main agent.
10. **Other running sessions learn of organized memory** through a digest appended at their next turn.
11. **Compact.** A session is compacted when it reaches the context limit, and automatically when it is closed. The compact made at close is backed up to the cloud automatically; a harness can look it up later and can continue from it.
12. **Prefix caching is important.**
13. **Prompts are English**: every prompt, system prompt, and injected message. As in Claude Code's prompts, the system prompt states which language the character replies in. Prompt design learns from Claude's.
14. **References:** the gateway learns from sub2api and similar gateways, the harness from other harnesses; everything is written in Rust. DeepSeek is the provider the design is built for first.

## Design as it stands (the agent's reading and proposals)

- **Execution is distributed; memory is central.** The harness loop, sessions and their JSONL, tools, and devices live on nodes. Accounts, keys, memory, the archive of compacts, the fan-out of notices, and the registry of node capabilities live in the cloud (question 1 asks where exactly). Synchronizing memory then means that every node reads and writes one store and is told of changes; nodes hold caches, not replicas that must be merged.
- **Continuity across nodes comes from memory and compacts, not from transcripts.** Carrying on elsewhere means starting a session there from an uploaded compact plus the shared memory. The original session stays where it was, so the two become separate sessions of the same character.
- **Compacts double as the archive of past conversations.** A built-in tool lets the character search and read them.
- **Only history lines form the prompt.** A JSONL line says whether it is part of the history. Decision records, fork records, and other bookkeeping never enter the prompt, so the prefix stays stable for the life of a session on its node. New information is appended as a notice; nothing is edited in place.
- **Three kinds of fork reuse the parent's prefix:** the memory decision, the organizing fork, and the compact.
- **Remote capabilities** come in two sizes: a tool call (short, answered at once) and a delegated task (the remote node runs it as a session of its own and returns a result or a compact).

Dropped from the agent's earlier proposal: replicating JSONL through the gateway, gateway-ordered session lines, a writer lease per session, parent ids for cross-node branches, and identical tool sets on every node for cross-node cache hits.

## Open questions put to the user (fourth round)

1. Where do memory and compacts live: in the gateway's PostgreSQL, or on a cloud node with the gateway only routing?
2. Leaving a session open and picking up another device: no compact has been uploaded then. Proposal: upload every compact, not only the one at close; treat a long pause as a close; and compact an unclosed session at the node's next start.
3. Are a tool call and a delegated task enough as units of remote capability, or should a whole interactive session be able to run on a remote node with the local node as its screen?
4. May remote calls go through the gateway first, with direct routes between nodes coming last?

## Not yet examined

How DeepSeek's prefix cache behaves (minimum length, lifetime, scope per key). If the gateway pools upstream keys, a session probably has to stay on one key to keep hitting the cache.
