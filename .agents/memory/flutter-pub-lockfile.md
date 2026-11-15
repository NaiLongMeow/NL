---
name: flutter-pub-lockfile
description: Recall before committing apps/client/pubspec.lock, or when running Flutter with a pub mirror such as PUB_HOSTED_URL.
metadata:
  type: project
  scope: apps/client (Flutter) dependency lockfile
  status: active
  last_verified: 2026-11-15
---

`apps/client/pubspec.lock` must reference `https://pub.dev` only. With `PUB_HOSTED_URL` set to a mirror, every command that resolves packages (`flutter pub get`, but also `flutter analyze`, `flutter test`, and `flutter build`) rewrites the lockfile's URLs to the mirror.

**Why:** CI runs `flutter pub get --enforce-lockfile`, which fails when the lockfile's hosted URL differs from the one in use. Package content hashes are identical across mirrors, so only the URL needs restoring.

**How to apply:** Before staging the lockfile, run `sed -i 's#https://pub.flutter-io.cn#https://pub.dev#g' apps/client/pubspec.lock` (or the equivalent for the mirror in use) and confirm `flutter pub get --enforce-lockfile` passes without the mirror variable.

**Evidence:** Observed 2026-11-15: lockfile URLs flipped to pub.flutter-io.cn after `flutter analyze` and `flutter test`; after restoring pub.dev, `flutter pub get --enforce-lockfile` succeeded with `PUB_HOSTED_URL` unset.

**Recheck when:** pub starts writing mirror-independent URLs, or CI drops `--enforce-lockfile`.
