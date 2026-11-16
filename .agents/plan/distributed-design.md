# Distributed design (under discussion)

How sessions and memory stay in step across nodes. The user called this the core problem and the core feature of NL on 2026-11-16 and asked to discuss it carefully before anything is fixed. Nothing below is decided except the section "What the user requires". When the discussion settles, move the result into [architecture-invariants](../memory/architecture-invariants.md) (S1, S2, S4 will change), revise the [roadmap](roadmap.md), and delete this file.

## What the user requires (2026-11-16)

- Seamless distribution: finish talking on one node and carry on from another.
- Memory is synchronized between nodes.
- Urgent memory: the harness synchronizes it at once, on its own initiative, and can push a notice to the other nodes that are running.
- Normal memory: organized automatically, as needed, when a conversation ends.
- Session data is stored as JSONL.
- Several nodes each run the harness. This replaces the first draft's "one host per character" (S1).

## Proposal on the table (the agent's, not yet accepted)

1. **State belongs to the account, not to a node.** Sessions and memory form a replicated log per account. Every harness node holds a local replica (JSONL files plus derived indexes) and is an interchangeable worker over it.
2. **The gateway orders everything.** Keys live only in the gateway, so a node can converse only while connected to it. A node therefore never produces turns offline, and the gateway can assign one order to all records. No merging of divergent histories and no CRDTs are needed.
3. **One writer per session at a time.** A lease held through the gateway says which node may append to a session. Carrying on elsewhere is a lease handoff. In the rare case of a lost lease with unsent lines, the orphan lines are kept as a side branch, so JSONL lines carry parent ids.
4. **Two planes.** The state plane (sessions, memory, notices: small, durable, ordered) goes through the gateway, which stores it in PostgreSQL and fans it out with Redis. The live plane (audio, cues, a body attached to a node, tools borrowed from another node) goes direct first and through the relay last.
5. **Memory is a stream of events** (add, update, retire) that every node replays into the same state. An event marked urgent is fanned out immediately, and a running harness injects it into its active sessions as an appended notice at the next step. Normal memory is produced by consolidation when a conversation ends, claimed by a lease so that exactly one node does it.
6. **The prompt is a pure function of the log**, so any node builds the same prompt for the same session, which keeps provider-side prefix caching effective and makes sessions replayable (E1, E3).

Alternatives considered: a single host with thin bodies (simple, but needs an always-on host and is not what the user wants); peer-to-peer synchronization with CRDTs (works offline, but offline nodes cannot call the model anyway, so the complexity buys nothing).

## Open questions put to the user

1. Does the gateway store the synchronized records, and as ciphertext (nodes hold the key; adding a device needs an existing device's approval or a recovery code) or as plaintext (simplest; the gateway is trusted)?
2. Is a character's conversation one continuous thread, with sessions as technical segments, or many separate conversations? What happens when two bodies are used at once?
3. Which nodes run the harness loop: only the desktop and a server, or the phone as well? Which node serves an ESP32?
4. Does "push a notice to running nodes" mean a message injected into the harness running there, a notification shown to the user there, or both?
5. What ends a conversation, and which node consolidates when the node that held it has gone away?
