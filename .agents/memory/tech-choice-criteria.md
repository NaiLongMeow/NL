---
name: tech-choice-criteria
description: Recall when choosing a language, framework, or toolchain for any part of NL, or when weighing options by maintenance cost.
metadata:
  type: feedback
  scope: Technology, framework, and toolchain decisions across all NL components
  status: active
  last_verified: 2026-11-15
---

Do not treat human maintenance cost (number of codebases, duplicated UI, extra languages) as a core factor when choosing a stack. Weigh instead how reliably an agent can set up, build, test, and debug the toolchain from the command line, and what platform capabilities the option exposes.

**Why:** NL is a vibe-coding project in which agents write most of the code, so duplicated code is cheap while a toolchain that stalls agents is expensive. The user reported that many agents get stuck for a long time configuring React Native environments, which is why React Native was rejected for mobile despite letting mobile share TypeScript with desktop.

**How to apply:** Prefer stacks with fewer build layers, project configuration kept as plain text, and builds and tests that run headless from a CLI. Do not reject an option only because it adds a codebase or a language.

**Evidence:** User statement in conversation, 2026-11-15.

**Recheck when:** The project stops being primarily agent-written, or the user reports that a previously rejected toolchain now sets up cleanly for agents.
