---
name: tool-system
description: Recall before designing or implementing the harness's tools, tool search, toolsets, MCP support, remote tool calls, the message and finish tools, preset agents, or how tool calls are named and shown in the UI.
metadata:
  type: project
  scope: The harness core's tool surface on every node and provider, NL toolsets, MCP servers, and how tool calls appear in every UI
  status: active
  last_verified: 2026-11-18
---

The harness offers the model one small, fixed set of tools and reaches every other tool through two of them: `tool_search` finds tools and `use_tool` calls them, on every provider. The rules are M5 and M6 in [[architecture-invariants]]; this entry explains the parts and the reasons, and marks what is still the agent's proposal.

## What the model sees

| Part | Where it sits | Size |
|---|---|---|
| The core tools | Tool definitions, identical on every node, provider, and session | Fixed |
| The tool categories | System prompt, fixed text written by NL | Fixed |
| The account's devices, and a few of its most-used tools with their signatures | Session-start snapshot, refreshed at compaction | Bounded |
| Search results and loaded definitions | Appended as tool results | Bounded by the output threshold (M7) |
| Changes to tools already used in the session (a device went offline, a definition changed) | Appended notices | Bounded by what was used |

Nothing the model sees grows with the number of toolsets or devices that exist.

The core tools (working names; the Stage 3 design note fixes names and schemas):

- `message`: the only way to talk to the user; it streams into a bubble (M5).
- `finish`: the only way to end a turn (M5). When the turn sent no message, or its last tool call before finish was not a message, finish must carry an explicit silence argument whose value names that case; otherwise the harness refuses it with an error the model sees.
- `read`, `write`, `edit`, `find`: the base file tools, each with an optional `node`. Paths under `/memory/` are the shared file system, `/compacts/` is its read-only folder, and other paths are files of the node that runs the tool. Memory needs no tools of its own, because memory is files (S3).
- `web_search`, `web_fetch`: through the gateway's proxy (E5). DeepSeek offers these as server tools ([[deepseek-reference-provider]]); the adapter decides how to map them.
- `tool_search` and `use_tool`.

## Toolsets

- Every tool beyond the core belongs to a toolset: a named group of related tools, usually about ten or fewer (a guideline, not a hard limit), described in NL's toolset format. The format holds the toolset's id, display name, category, and one-line description (what search matches), and for each tool: id, display name, description, input schema, the risk hints the permission policy uses (deletes data, contacts people, spends money, acts on the physical world; T7), the key argument shown in the UI, whether the tool is bound to the node it runs on, a short localized activity text for the chat view's working indicator, and an optional dedicated rendering.
- Toolsets come from a node's built-in sets (for example shell, device, audio), from other nodes that offer theirs through the gateway's capability registry (S8), and from installed third-party toolsets. Third-party code always runs outside the node process (T8).
- MCP servers work directly, without conversion. Each counts as one toolset with defaults: category "other", the server's own tool names, descriptions treated as untrusted (T6) and shortened for search, and unknown risk, so every call asks first. NL ships a skill, an instruction folder that coding agents can follow, that turns an MCP server into an NL toolset: it writes the manifest, chooses the category, display names, and risk hints, and splits a large server into several toolsets.
- A toolset that several nodes offer counts once (P3). A tool bound to its node needs `node`; for any other tool, the harness picks an available node and reports which one ran it.

## Finding and calling

- `tool_search(query)` returns one line per matching entry, best matches first; an exact id returns the full definition, which is what a "help" tool would do. Query forms, borrowed from Claude Code's ToolSearch: keywords, and `select:<id>` to load one definition. Its description tells the main agent to hand broad exploration to the tool finder, so that the main context does not fill early.
- No tool has a fixed number of results or a page size *(user, 2026-11-18)*. The only limit on any tool's output, in any agent, is the output threshold (M7): the output is cut where it would take the context past that threshold, which lies below the compaction threshold, and the context gets the path of the file that holds the whole output (see "Tool output files").
- The catalog version is pinned when a session starts and refreshed at compaction, so results stay stable and replayable (E3). Whether a node is online is checked when a tool is called.
- `use_tool(tool, args, node?)` runs only tools whose definitions the model has seen in this session. Calling an unseen tool returns its definition, and the model calls again. Arguments are checked against the definition, and an error returns the correct definition. If the definition changed since the model saw it, the call fails and returns the new one.
- The tools found in a session are recorded at compaction, and the new prefix carries their signatures, within a bound, so the model need not search again. Claude Code keeps its discovered tools across compaction the same way.
- A preset agent, the tool finder, takes a vague need and explores the catalog in its own context with catalog tools of its own *(user, 2026-11-18)*: listing categories, toolsets, and tools, searching, and reading definitions. Its context starts small and is thrown away once it answers, so it can read whole categories. It returns recommended tool ids with reasons. The main agent then loads and calls them, so approvals stay with the main agent. It is the first of the harness's preset agent types.

## Tool output files

*(user, 2026-11-18)* Every tool output is saved as a file of the session that made the call, in the session's folder next to its JSONL. An output that fits under the output threshold (M7) also goes into the context whole. One that does not fit puts into the context the part that fits, the file's path, and its size, and the model reads or searches the rest with `read` and `find`, which reach the session's output folder by path. Claude Code persists oversized tool results the same way; NL saves every output, and the cut point is the output threshold rather than a fixed size.

Three problems reported against Claude Code's version shape the rules:

- The JSONL holds what the model saw and the file's path, never the full output again, so a session with large outputs stays quick to resume and replay (E3).
- Output files belong to their session: they are exported and deleted with it (S9) and never copied into logs (T9). Nothing accumulates after a session is deleted.
- Reading the session's own output folder is always allowed by policy, and every agent that can receive a cut output has `read` and `find`.

Open points for the Stage 3 and Stage 5 design notes: where a node with little storage, such as an ESP32, keeps its output files; whether a remote tool's full output travels to the calling node or stays on the node that ran it and is read there with `node`.

## Names and display

- Internal names follow the providers' rules for function names (letters, digits, `_` and `-`, at most 64 characters): core tools have plain names, toolset tools are `toolset__tool`, and MCP tools are `mcp__server__tool`, as in Claude Code. A node is an argument, never part of a name.
- Display names exist only in the UI: `Toolset.Tool` in PascalCase with the key argument, such as `Docs.Read(hello.md)`; a remote node goes in front, as in `Remote(desktop3).Docs.Read(hello.md)`; a raw MCP tool keeps its own name behind its server, as in `MCP(github).create_issue`, and the two combine, as in `Remote(server1).MCP(github).create_issue`. Display names stay English in both UI languages. `message` renders as a bubble, and an accepted `finish` is not shown ([UI design](../../docs/design/ui.md)).

## Rejected alternatives

- Loading definitions into the provider's tool list on demand: it breaks the cache from that point on (M2), and function names cannot carry forms like `Remote(desktop3).Edit`.
- Native tool search on providers that have it (Anthropic, OpenAI's Responses API): it would give the model two different contracts; the user chose `use_tool` everywhere for simplicity.
- A directory of all toolsets in the session-start snapshot: it grows with the catalog, and its changes flood the session with notices.
- Fixed result counts and page sizes, set per agent type: more settings than needed, where the output threshold covers every tool with one rule (user, 2026-11-18).
- Every tool behind one dispatcher, `message` and `finish` included: a message must stream and a finish must be checked, and the base file tools are used too often to cost a lookup each time.

## Who decided what

- The user, on 2026-11-18: the message and finish rules (M5); toolsets in NL's format, MCP servers usable directly, and a skill that converts them; tool search as the core; `use_tool` on every provider; the tool finder as a preset agent with catalog tools of its own; no result counts or page sizes, only the output threshold (M7); every tool output saved as a file of the session; the core tools as listed above, approved after a summary on 2026-11-18, with the question still open whether find becomes two tools, grep and glob; the display names; internal names by the providers' standard.
- The agent's proposals, which the user has not contradicted and which the Stage 3 and Stage 5 design notes settle: the core tools' exact names and schemas; the silence argument's values; `finish` carrying the result of forks and tasks, which cannot call `message`; the category list; the threshold values; the pinned catalog; look before calling; serving third-party NL toolsets over the MCP protocol; the defaults for raw MCP servers; the query forms.

**Why:** A tool list that never changes keeps the prefix cacheable (M2), and an identical system prompt and core tool list on every node may let all sessions share one cached prefix through the gateway's key, which the provider-cache spike measures. Keeping the catalog out of the prompt keeps thousands of tools on many nodes usable for a small model (E5); the user raised the scale problem on 2026-11-18. The output threshold protects every context with one rule instead of a limit per tool. One contract serves every provider (E5), and DeepSeek has no native tool search. Third-party descriptions reach the model as untrusted tool results (T6), not as tool definitions, and looking before calling stops blind calls with side effects (T7).

**How to apply:** Build the core tools, `tool_search`, and `use_tool` in Stage 3 over the built-in toolsets; add NL toolsets from third parties, MCP servers, the conversion skill, remote toolsets, and the tool finder in Stage 5. Never change the tool list within a session. Settle the proposals above with the user in those stages' design notes before building on them.

**Evidence:** User statements in conversation, 2026-11-18. Claude Code's ToolSearch as described at https://dev.to/oldeucryptoboi/how-tool-search-defers-tools-to-save-tokens-3ln5 and https://code.claude.com/docs/en/mcp; OpenAI's tool search (namespaces, loaded definitions placed at the end of the context to keep the cache, fewer than ten functions per namespace recommended) at https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/tool-search; DeepSeek's lack of it in [[deepseek-reference-provider]]; all read 2026-11-18.

**Recheck when:** The Stage 3 or Stage 5 design note settles the proposals; the provider-cache spike measures whether sessions share a prefix; a provider changes how tools can be loaded; tool counts or failure rates show that a limit is wrong.
