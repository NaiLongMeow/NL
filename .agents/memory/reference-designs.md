---
name: reference-designs
description: Recall before designing the gateway or the harness, or when deciding whether to borrow a design or code from another project.
metadata:
  type: reference
  scope: Design of nl-gateway and nl-node
  status: active
  last_verified: 2026-11-16
---

The user named the projects to learn from. For the gateway: sub2api and other well-made API gateways. For the harness: the good parts of other agent harnesses; Claude Code, Codex, and pi are cloned for reading under the gitignored `.ref/`. Everything in NL is nevertheless written in Rust: take designs, not code.

**Evidence:** User statement in conversation, 2026-11-16. The user said not to read the reference code yet, so the agent has not examined sub2api or decided what to borrow.

**How to apply:** Read the reference when writing the design note of the stage it concerns (the gateway for Stage 2, the harness for Stage 3), and say in the note what was borrowed and why. Check a project's license before reusing anything beyond ideas (E8 in [[architecture-invariants]]).

**Recheck when:** A design note has examined a reference, or the user names other references.
