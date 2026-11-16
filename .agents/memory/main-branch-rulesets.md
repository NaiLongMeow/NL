---
name: main-branch-rulesets
description: Recall before changing how main is protected, renaming the `CI OK` job, or concluding that main is unprotected.
metadata:
  type: project
  scope: GitHub settings of NaiLongMeow/NL, default branch
  status: active
  last_verified: 2026-11-16
---

Main is guarded by repository rulesets, not classic branch protection, so `GET repos/NaiLongMeow/NL/branches/main/protection` answers 404 "Branch not protected" even though main is protected. Read `GET repos/NaiLongMeow/NL/rules/branches/main` or `.../rulesets` instead.

- `protect-main`: no deletion, no force push; nobody can bypass, admins included.
- `require-pr-for-contributors`: changes need a pull request with one approval (stale approvals dismissed on push).
- `require-ci-for-contributors`: the `CI OK` check from GitHub Actions (integration 15368) must pass; branches need not be up to date with main.
- The last two list the repository admin role (`RepositoryRole` 5) as an `always` bypass actor.

**Why:** The user wants only admins able to push directly while everyone else goes through pull requests and passing CI, and wants admins able to skip CI so a broken CI cannot block urgent or frequent changes (user statements, 2026-11-16). AGENTS.md still tells agents to use pull requests; the bypass is for humans handling exceptions.

**How to apply:** `CI OK` is matched by name, so renaming the `ci-ok` job's `name` in .github/workflows/ci.yml silently blocks every contributor pull request until the ruleset is updated. That job must keep `if: always()` and list every job, `changes` included, in `needs`, or a failure can surface as skipped jobs and a passing `CI OK`. Changing rulesets is a shared-settings change: confirm with the user first.

**Evidence:** `gh api` reads of the rulesets on 2026-11-16; `require-ci-for-contributors` (id 27344684) was created that day at the user's request.

**Recheck when:** Rulesets are edited in the GitHub UI, the `CI OK` job is renamed or split, or the repository moves to an organization-level ruleset.
