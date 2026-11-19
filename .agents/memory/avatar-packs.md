---
name: avatar-packs
description: Recall when touching avatars, the desktop pet's modes, web/stage, the nl-avatar skill, nl-assets, Live2D, or anything that might commit third-party art, models, or runtime files.
metadata:
  type: project
  scope: Avatars on every client: the pack format, its checks, the renderers, and the Live2D runtime
  status: active
  last_verified: 2026-11-19
---

The desktop pet has two modes that the user picks: **light**, the built-in ball or an avatar made of images, and **Live2D**, an avatar's Live2D model. Users add avatars themselves, as folders with an `avatar.json` in the format published with the agent skill [skills/nl-avatar](../../skills/nl-avatar/SKILL.md) (spec: `references/format.md`), usually by asking an agent such as Claude Code or Codex to convert their art, check it, and install it. Live2D never enters the repository, and NL never ships the Cubism runtime.

Each rule has one implementation that every reader shares:

- **File rules** (allowed extensions, file count and size limits) are `skills/nl-avatar/scripts/lib/rules.json`, read by the skill's checker and, through `include_str!`, by the Rust crate `nl-assets`, which is the app's security boundary: the desktop serves a file over the `nlavatar` URI scheme only when its path passes the file rules, and never follows a link out of a pack folder.
- **Manifest rules** (keys, the cue mapping and its fallbacks, referenced files, Live2D names) are `skills/nl-avatar/scripts/lib/format.ts`, imported by the skill's CLI, the desktop main window, and `web/stage`. The skill runs on Node 22.18+ type stripping, so the skill's files stay erasable TypeScript with `.ts` import extensions.
- **The Live2D runtime**: release builds load one only if its digest is in `ACCEPTED_RUNTIMES` (apps/desktop/src-tauri/src/avatars.rs), which is empty, so released builds show no Live2D. Debug builds take a runtime from `NL_DEV_LIVE2D_RUNTIME` and extra avatar folders from `NL_DEV_AVATARS`.

**Why:**

- Users import avatars through agents, so the spec and its checker must be something an agent can install and run by itself (a skill with a CLI), and the app must accept exactly what the checker accepts; one rules file read by both keeps them from drifting apart.
- Avatars come from anyone, so a pack is data only: nothing the renderer executes. An imported pack cannot inject code into the webview (T8).
- Cubism Core is under the Live2D Proprietary Software License and cannot be redistributed with an open-source repository; the Cubism Web Framework is under Live2D's own Open Software License. Both load at run time from a runtime folder, never from an avatar, so sharing an avatar never redistributes them.
- An app that loads any user's model is a Live2D "Expandable Application". Every publisher, individuals and General Users included, needs Live2D's approval and a special agreement before release; "as a general rule, fully free of charge is not eligible for approval"; General Users pay a revenue share of $1.88 (¥300) per sale or 20%, whichever is higher. Whether and how released builds show Live2D is therefore the user's decision (UI design note, open question 13; roadmap, open question 1). The terms do not say whether an app whose users bring their own runtime still counts as one; ask Live2D before relying on that.

**How to apply:**

- Never commit `.moc3` files, `*.model3.json`, Cubism Core or Framework builds, art without a recorded license, or pack archives; gitignore any place where a pack is staged. Test fixtures are generated at test time by `skills/nl-avatar/tests/fixtures.ts`.
- Change file rules only in `rules.json` and manifest rules only in `format.ts` together with `references/format.md`, then run the tests of the skill, `web/stage`, the desktop app, and `nl-assets`.
- Do not add an accepted runtime digest, or describe a way for released builds to load Live2D, without the user's decision.
- Show the author and license from `avatar.json` beside the avatar.

**Evidence:**

- The user's decisions: 2026-11-15, Live2D stays out of the repository and runtimes ship apart from characters; 2026-11-19, "设计为双模式可选，一种是低占用的小球或自定义桌宠，一种是占用性能多的live2d，用户可自行导入形象，可以设计一套规范并做成skill，这样就能确保用户可以轻松导入，因为一般都会让agent如ClaudeCode、Codex自动帮忙配置".
- Live2D's Expandable Application terms, https://www.live2d.com/en/sdk/license/expandable/, read 2026-11-19; the Cubism Core license from Live2D's EULA pages, read 2026-11-15.
- The first design followed dsh-go (gitignored `.ref/dsh-go`, AGPL, read for ideas only): `app/lib/companion/companion_pack.dart` and `docs/design/companion.md` §3, read 2026-11-15. dsh-go bundles runtime and character in one zip; keeping them apart is NL's own choice.
- Checked in the running development app on 2026-11-19: the app lists installed and development avatars, and the pet shows a different look for each state in both the light and the Live2D rendition.

**Recheck when:** Live2D changes its terms or the user settles Live2D in releases (then update `ACCEPTED_RUNTIMES` and this entry), Node changes type stripping, or an avatar format needs anything executable.
