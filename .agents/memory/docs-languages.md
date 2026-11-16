---
name: docs-languages
description: Recall before writing or editing human-facing docs (README, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, docs/) or choosing which language they are written in.
metadata:
  type: project
  scope: Human-facing documentation in the repository root and docs/
  status: active
  last_verified: 2026-11-16
---

Human-facing docs are English-first with Simplified Chinese translations next to them as `*.zh-CN.md`: README, CONTRIBUTING, SECURITY, and CODE_OF_CONDUCT. A change to one language version updates the other in the same pull request. The working rules for contributors live in [CONTRIBUTING.md](../../CONTRIBUTING.md#documentation-and-translations); this entry keeps the decision and its limits.

**Why:** The user asked on 2026-11-16 for internationalized docs with an English main README and a separate Chinese README, and for community files placed where large open-source projects keep them (root CONTRIBUTING, CODE_OF_CONDUCT, SECURITY). Before that, all human docs were Chinese only.

**How to apply:** Write new root-level docs in English and add the zh-CN translation in the same change. The two READMEs are parallel texts, not translations: the user asked on 2026-11-16 for each to follow its own language's idiom, with classical allusions from its own canon (an epigraph opens every section, English sources in README.md and Chinese classics in README.zh-CN.md), while keeping the same sections in the same order. When editing one README, carry the factual change to the other and keep its voice; quote sources accurately and attribute them. CONTRIBUTING and SECURITY stay plain, close translations. The Code of Conduct texts are the official Contributor Covenant 3.0 English and zh-CN versions with only the reporting line filled in and the template notes removed; do not reword them, take updates from the upstream project. docs/architecture.md is still Chinese only and links to README.zh-CN.md. The user said on 2026-11-16 that the language of docs/ does not matter, so new files under docs/ are written in English, because agents read them, and are translated only when someone asks.

**Evidence:** User statement and answers in conversation, 2026-11-16 (Contributor Covenant 3.0 with the reporting email to come later, GitHub private vulnerability reporting, Apache-2.0 section 5 instead of DCO or CLA, AI-assisted contributions welcome without labeling).

**Recheck when:** Another translation is added, docs/ gets English versions, or the project adopts a translation platform.
