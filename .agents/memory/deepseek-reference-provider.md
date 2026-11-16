---
name: deepseek-reference-provider
description: Recall before designing or implementing anything that calls a language model, web search or fetch, speech recognition, or speech synthesis, or when choosing which provider to build for first.
metadata:
  type: project
  scope: Provider interfaces in the node and the model proxy in the gateway
  status: active
  last_verified: 2026-11-16
---

NL is designed around the DeepSeek API. The main model is the one the user named "DeepSeek V4.1 Flash". The user also plans to use DeepSeek's official search and fetch APIs and its speech-recognition and speech-synthesis APIs. Integrating them is later work, not a current task.

**Why:** The user's choice, stated on 2026-11-16. The user gave no reasons.

**How to apply:** Build each provider interface for DeepSeek first, behind the interface that E5 in [[architecture-invariants]] requires. Size the harness for a small, fast main model: few tools, plain instructions, short prompts. The agent has not verified the model name, the shape of these APIs, or that each of them exists; read DeepSeek's documentation when the work starts and do not write calls from memory (E8).

**Evidence:** User statement in conversation, 2026-11-16.

**Recheck when:** The integration work starts, DeepSeek changes its models or APIs, or the user names another main provider.
