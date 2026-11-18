---
name: generated-files
description: Recall before writing or changing a code generator, or before committing any file a tool produced from another file (design tokens, protocol code, localization catalogs, icon sets).
metadata:
  type: feedback
  scope: Every generated file in the repository, on every platform
  status: active
  last_verified: 2026-11-18
---

Generated files are build outputs. Commit the source and the generator only; gitignore the output, and make every build step that reads it run the generator first.

**Why:** On 2026-11-18 the design-token generator was first written to commit its outputs, with a test that failed while they were stale. The user corrected that: do not depend on someone generating and committing by hand each time; change only the source, and generate everything else at build time as one of the build steps, because that is more robust. A committed copy needs someone to remember to regenerate it, and a stale copy still builds wherever the staleness check does not run.

**How to apply:**
- Every entry point that reads the output generates it first: package scripts (`nl-tokens && vite build`), `pnpm install` through the generator package's `prepare` script, a `build.rs` for Rust (nl-proto already generates its code with prost this way), and an explicit step in CI and release jobs for toolchains without a pre-build hook, such as Flutter.
- Keep the generator's own dependencies minimal so that jobs for other toolchains can run it: the token generator (web/tokens/src/cli.ts) needs Node and nothing from the workspace.
- Rewrite an output only when its content changes, and atomically, because several builds may run the generator at once.
- Lockfiles and other files a tool expects to be committed are not generated files in this sense.

**Evidence:** The user's correction in conversation, 2026-11-18. The token pipeline follows it: outputs listed in .gitignore, generation in the web packages' scripts and in the Flutter jobs of .github/workflows/ci.yml and release.yml, and section 11 of docs/design/ui.md.

**Recheck when:** A platform's build cannot run a generator (for example a hosted build service without Node), or the user changes the rule.
