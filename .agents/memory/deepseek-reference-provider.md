---
name: deepseek-reference-provider
description: Recall before designing or implementing anything that calls a language model, web search or fetch, speech recognition, or speech synthesis, before designing the tool system, or when choosing which provider to build for first.
metadata:
  type: project
  scope: Provider interfaces in the node and the model proxy in the gateway
  status: active
  last_verified: 2026-11-18
---

NL is designed around the DeepSeek API. The main model is the one the user named "DeepSeek V4.1 Flash". The user also plans to use DeepSeek's official search and fetch APIs and its speech-recognition and speech-synthesis APIs. Integrating them is later work, not a current task.

What DeepSeek's documentation said when read on 2026-11-18:

- The API comes in three formats: Chat Completions, an Anthropic-compatible `/messages`, and a Responses-compatible API. The pages name the models `deepseek-flash` and `deepseek-v4-pro`; which id the user's "V4.1 Flash" maps to is not confirmed.
- Tool use works in thinking and non-thinking mode (since V3.2). Strict schemas are a beta on the `/beta` base URL, with schema limits listed in the tool-calls guide.
- Forcing a tool call (`tool_choice` `any` or a named tool, in the Anthropic format) works only in non-thinking mode; in thinking mode with only client tools it returns HTTP 400.
- No format supports deferred tool loading, `tool_reference` blocks, or client-side tool search, and tool definitions cannot be added mid-conversation. Every format accepts `system` messages mid-conversation; only the Anthropic and Responses formats accept inserted tool-call messages.
- Web search and URL reading are server tools: `deepseek_web_search` and `deepseek_read_url` in the Anthropic format, `web_search` in the Responses format and only with `deepseek-v4-pro`.
- `cache_control` is ignored, because caching is automatic. The Responses format ignores `parallel_tool_calls` and silently ignores unsupported parameters.
- The pages say nothing about streaming tool-call arguments or about several tool calls in one Chat Completions response.

**Why:** The user's choice, stated on 2026-11-16. The user gave no reasons. The documented facts above decide parts of the tool system: without native tool search, loading tool definitions on demand must be emulated without changing the prefix (M2).

**How to apply:** Build each provider interface for DeepSeek first, behind the interface that E5 in [[architecture-invariants]] requires. Size the harness for a small, fast main model: few tools, plain instructions, short prompts. The speech APIs and the open items above (argument streaming, parallel calls) are unverified; read the documentation of the version in use when the work starts, and do not write calls from memory (E8).

**Evidence:** User statement in conversation, 2026-11-16. https://api-docs.deepseek.com/guides/tool_calls/, https://api-docs.deepseek.com/guides/anthropic_api, and https://api-docs.deepseek.com/guides/responses_api, read 2026-11-18.

**Recheck when:** The integration work starts, DeepSeek changes its models or APIs (in particular if it adds tool search or deferred loading), or the user names another main provider.
