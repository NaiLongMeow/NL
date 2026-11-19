# Contributing to NL

English | [简体中文](CONTRIBUTING.zh-CN.md)

Thank you for your interest in NL. This guide explains how to propose a change and what a change needs before it can be merged. Everyone taking part in the project is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- **Report a bug or request a feature** in [GitHub Issues](https://github.com/NaiLongMeow/NL/issues). Search existing issues first. For a bug, include what you did, what you expected, what happened instead, the version or commit, your platform (operating system, phone, or board such as an ESP32-S3 module), and any logs.
- **Report a security vulnerability privately**, never in a public issue. See the [security policy](SECURITY.md).
- **Send a pull request** to fix a bug, add a feature, or improve tests and documentation. For a large change, such as a new component, a protocol change, or a new external service, open an issue first so the approach is agreed on before you invest in it.

## Languages

Code, identifiers, comments, commit messages, pull request titles, and the agent records under `.agents/` are written in English, so every contributor, and every contributor's coding agent, can read and search them.

Issues, pull request descriptions, and review discussion may be in English or Chinese. English reaches more people, so use it when you can.

## Setting up

The toolchains for each part of the repository, and the commands to build and test them, are listed under [Development setup](README.md#development-setup) in the README.

## Making a change

1. Branch from an up-to-date `main`; contributors without write access work from a fork. Use one branch per change.
2. Keep each pull request to one coherent change, so it can be reviewed and, if needed, reverted on its own. Put unrelated fixes in their own pull requests.
3. Write commit messages in the [Conventional Commits](https://www.conventionalcommits.org/) style, for example `fix(desktop): place the pet from its configured size` or `docs: explain asset pack limits`. Release notes are generated from these messages.
4. Before asking for review, bring your branch up to date with `main` and resolve any conflicts.
5. Fill in the pull request template: what the change does and why, and how it was tested.

## Tests

Untested code does not land. Every change to behavior ships with automated tests that exercise it, and those tests pass before the pull request is opened. Many people build on `main` at the same time, and one untested change can break the project for all of them.

Hardware-bound code is no exception: test its logic on the host or in an emulator, and state in the pull request what still needs checking on a real device.

Run the checks for the parts you touched before pushing. CI runs the same commands:

| Part | Checks |
|---|---|
| Rust workspace | `cargo fmt --all --check`, `cargo clippy --workspace --all-targets --locked -- -D warnings`, `cargo test --workspace --locked` |
| Firmware (`firmware/esp32`) | `cargo build --release --locked`; `rustfmt --check --edition 2024 firmware/esp32/build.rs firmware/esp32/src/main.rs` from the repository root |
| Flutter client (`apps/client`) | First `node web/tokens/src/cli.ts` from the repository root, which generates the design tokens; then `dart format --output=none --set-exit-if-changed .`, `flutter analyze --fatal-infos`, `flutter test` |
| Web packages and skills (`web/`, `apps/desktop`, `skills/`) | `pnpm -r run typecheck`, `pnpm -r run test`, `pnpm -r run build` from the repository root |
| Desktop app (`apps/desktop`) | `pnpm tauri build` |
| Protocol (`proto/`) | `buf lint`, `buf format --diff --exit-code` |
| Versions (`tooling/`) | `bash tooling/check-version.test.sh`, `bash tooling/check-version.sh` |

## Code style

- Formatters have the final word: rustfmt for Rust, `dart format` for Dart. TypeScript must pass the type check.
- Comment generously. Code here is read by people and by coding agents alike, so explain the reasons, constraints, and invariants that the code itself cannot show. Do not describe the history of a change in comments; that belongs in the commit message.
- Add a dependency only when it earns its place, and make sure its license is compatible with Apache-2.0.

## Review and merging

`main` accepts changes only through pull requests. A pull request can be merged once:

- the `CI OK` check passes. CI runs only the jobs relevant to the paths you changed, and `CI OK` sums up their results;
- at least one maintainer has approved it. A new push dismisses earlier approvals.

Nobody can force-push to or delete `main`. Repository administrators can bypass the pull request and CI requirements; this is reserved for emergencies such as a broken CI.

## AI-assisted contributions

Contributions written with the help of AI coding tools are welcome; much of NL itself is built that way. Whatever tools you use, you are responsible for what you submit:

- Read and understand every line of the change, and be ready to explain it in review.
- Run the tests and check the behavior yourself; do not submit output you have not verified.
- Make sure generated code and content do not copy material under licenses incompatible with Apache-2.0.

You do not need to label which parts were AI-assisted. Coding agents working in this repository follow [AGENTS.md](AGENTS.md) and keep their records under `.agents/`.

## Assets and third-party content

Contribute only content you have the right to license under Apache-2.0, and credit its sources. Character models and runtimes with restrictive licenses, Live2D in particular, never enter the repository; they are distributed as separate asset packs, as described in [docs/architecture.md](docs/architecture.md) (in Chinese).

## Documentation and translations

The English documents are the reference versions. `README.md`, `CONTRIBUTING.md`, and `SECURITY.md` each have a Simplified Chinese translation next to them (`*.zh-CN.md`). When you change a document that has a translation, update the translation in the same pull request; if you cannot write the other language, say so in the pull request so a maintainer can follow up. The Code of Conduct translations come from the official Contributor Covenant project. Documents under `docs/` are currently written in Chinese only.

## License

NL is licensed under the [Apache License, Version 2.0](LICENSE). Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in NL by you, as defined in the Apache-2.0 license, is licensed as above, without any additional terms or conditions. No contributor license agreement or commit sign-off is required.

## Releases

Maintainers publish releases. The process is described under [Releasing](README.md#releasing) in the README.
