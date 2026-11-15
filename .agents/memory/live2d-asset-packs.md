---
name: live2d-asset-packs
description: Recall when touching avatar rendering, Live2D, asset packs, or anything that might commit third-party model or runtime files.
metadata:
  type: project
  scope: Avatar rendering and character asset packs on every client
  status: active
  last_verified: 2026-11-15
---

Live2D never enters the repository. The Cubism runtime and characters ship as separate packs: a runtime pack (Cubism Core, Cubism Web Framework, shaders, licenses) whose digest each NL release pins, and data-only character packs checked against an extension allow-list. The format is described in [docs/architecture.md](../../docs/architecture.md#角色形象与素材包).

**Why:** Cubism Core is under the Live2D Proprietary Software License and cannot be redistributed with an open-source repository; businesses above 10 million JPY annual revenue also need a separate release license. Splitting runtime from character packs lets users share characters without redistributing Core. Pinning the runtime digest and allowing only data files in character packs means an imported pack cannot inject code into the renderer webview.

**How to apply:** Never commit `.moc3`, `*.model3.json`, Cubism Core, or pack archives, and gitignore any place where a pack is staged for a build. Put pack validation in the shared Rust `nl-assets` crate so every client runs the same, tested checks. Show the author and license from `character.json` in the UI.

**Evidence:** User decision, 2026-11-15. The design follows dsh-go (kept locally under the gitignored `.ref/dsh-go`): `app/lib/companion/companion_pack.dart` and `docs/design/companion.md` §3, verified by reading those files the same day. dsh-go bundles runtime and character in one zip; the split is NL's own change. License facts come from Live2D's Cubism Core docs and EULA pages, read 2026-11-15.

**Recheck when:** Live2D changes its license or publishes Core openly, or NL adopts an avatar format that needs executable code inside character packs.
