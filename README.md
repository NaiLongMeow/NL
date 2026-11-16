# NL

English | [简体中文](README.zh-CN.md)

NL is an open-source distributed agent harness for IoT and companionship: one character can live on your desktop, your phone, and devices such as the ESP32 at the same time, sharing memory, storage, and compute across them. Lightweight parts run on microcontrollers; heavyweight parts run on cloud servers.

> Status: early development. So far there are only project skeletons for each part, CI, and the release pipeline; nothing is usable yet.

Design and technology choices are described in [docs/architecture.md](docs/architecture.md) (in Chinese).

## Repository layout

| Directory | Contents | Technology |
|---|---|---|
| `proto/` | Protocol definitions shared by every part | Protobuf (checked with buf) |
| `crates/nl-proto` | Rust types for the protocol, `no_std` capable | Rust + prost |
| `crates/nl-transport` | Connection setup: tries direct routes in order, relay last | Rust |
| `crates/nl-assets` | Character asset pack format and validation | Rust |
| `crates/nl-node` | Harness node (shared by the desktop daemon and the cloud) | Rust + axum |
| `crates/nl-gateway` | Cloud gateway | Rust + axum |
| `apps/desktop` | Desktop app: main window and desktop pet window | Tauri 2 (TypeScript + Rust) |
| `apps/client` | Mobile app (Android, iOS) | Flutter |
| `web/stage` | Character rendering page (shared by desktop and mobile) | TypeScript + Vite |
| `firmware/esp32` | ESP32-S3 firmware | Rust + ESP-IDF |
| `docker/` | Container images for the node and gateway | distroless |
| `tooling/` | Scripts such as the version check | Bash |

## Development setup

| Part | Requirements | Common commands (in that directory) |
|---|---|---|
| Rust workspace | rustup (the version in `rust-toolchain.toml` installs automatically); on Linux also `libwebkit2gtk-4.1-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`, `libxdo-dev`, `libssl-dev` | `cargo test --workspace`, `cargo clippy --workspace --all-targets` |
| Flutter client | Flutter (version in `environment.flutter` of `apps/client/pubspec.yaml`) | `flutter test`, `flutter run` |
| Web frontends (stage, desktop UI) | Node.js 24, pnpm (version in the root `package.json`) | `pnpm install`, `pnpm -r run test` at the repository root |
| Desktop app | The Rust and web setups above; WebView2 on Windows (included in Windows 10/11) | `pnpm tauri dev`, `pnpm tauri build` in `apps/desktop` |
| Firmware | `cargo install espup ldproxy espflash`, then `espup install --targets esp32s3` | `cargo build --release`, `cargo run --release` (flashes the board and opens the serial monitor) |

Notes on building the firmware:

- `espup install` queries the GitHub API and is easily rate-limited when anonymous; if that happens, set `GITHUB_TOKEN` and retry (for example `GITHUB_TOKEN=$(gh auth token) espup install --targets esp32s3`).
- espup generates `export-esp.ps1` (Windows) or `export-esp.sh`; run it in every new terminal to set `LIBCLANG_PATH` and the Xtensa toolchain paths.
- The first build downloads ESP-IDF and its tools (about 6 GB) into `firmware/esp32/.embuild/`; if the network drops, building again resumes the download.
- On Windows, ESP-IDF needs a very short output path: set `CARGO_TARGET_DIR` to a short path (for example `C:\e32`) and `CARGO_WORKSPACE_DIR` to the absolute path of `firmware/esp32`, or build in WSL2 instead.

## Contributing

Contributions are welcome. Please read the [contributing guide](CONTRIBUTING.md) before sending a change, and follow the [Code of Conduct](CODE_OF_CONDUCT.md) in the community. Report security vulnerabilities privately as described in the [security policy](SECURITY.md), not in public issues.

## Releasing

1. In one pull request, change the version in all of these files to the same new version (`tooling/check-version.sh` checks that they match):
   - `Cargo.toml` (`[workspace.package]`)
   - `firmware/esp32/Cargo.toml`
   - `web/stage/package.json`
   - `apps/desktop/package.json` (`tauri.conf.json` reads its version from here)
   - `apps/client/pubspec.yaml` (also increment the build number after `+`)
2. After merging, tag `main` and push the tag, for example `git tag v0.2.0 && git push origin v0.2.0`. Pre-releases use the `-alpha.N`, `-beta.N`, or `-rc.N` suffix.
3. The release workflow then builds and publishes:
   - desktop installers: Windows (MSI and NSIS installer), macOS (DMG for arm64 and x86_64), Linux (deb, rpm, and AppImage for x86_64; deb and rpm for arm64);
   - the Android app as per-architecture APKs, an AAB, and debug symbols;
   - node and gateway binaries (Linux x86_64 / arm64, Windows, macOS arm64 / x86_64) for self-hosting without containers;
   - the ESP32-S3 firmware image (flash it at offset 0);
   - multi-architecture images `ghcr.io/nailongmeow/nl-node` and `nl-gateway` (only stable releases update `latest`);
   - a `SHA256SUMS` checksum file, build provenance attestations, and release notes generated from Conventional Commits.

To check that a downloaded file was built by this repository's release workflow, run `gh attestation verify <file> -R NaiLongMeow/NL`.

Signing is not set up yet: Android release builds are signed with the debug key, the Windows and macOS installers are not code-signed (on macOS, allow the app manually under Privacy & Security), and iOS is only compiled in CI, not published.

## License

[Apache-2.0](LICENSE). Unless you state otherwise, your contributions are licensed under Apache-2.0 as well; see the [contributing guide](CONTRIBUTING.md#license).
