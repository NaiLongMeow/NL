# NL

NL 是一个开源的分布式 agent harness，面向物联网与陪伴娱乐：同一个角色可以同时出现在桌面、手机和 ESP32 等设备上，各端之间共享记忆、存储和算力。轻量部分跑在单片机上，重量部分跑在云服务器上。

> 状态：早期开发。目前只有各端的项目骨架、CI 和发版流程，还没有可用功能。

设计与技术选型见 [docs/architecture.md](docs/architecture.md)。

## 仓库结构

| 目录 | 内容 | 技术 |
|---|---|---|
| `proto/` | 各端共用的协议定义 | Protobuf（buf 检查） |
| `crates/nl-proto` | 协议的 Rust 类型，支持 `no_std` | Rust + prost |
| `crates/nl-transport` | 连接建立：按顺序尝试直连，最后才走中继 | Rust |
| `crates/nl-assets` | 角色素材包格式与校验 | Rust |
| `crates/nl-node` | harness 节点（桌面守护进程与云端共用） | Rust + axum |
| `crates/nl-gateway` | 云端总网关 | Rust + axum |
| `apps/desktop` | 桌面端：主窗口与桌宠窗口 | Tauri 2（TypeScript + Rust） |
| `apps/client` | 移动端（Android、iOS） | Flutter |
| `web/stage` | 角色形象渲染页（桌面端与移动端共用） | TypeScript + Vite |
| `firmware/esp32` | ESP32-S3 固件 | Rust + ESP-IDF |
| `docker/` | 节点与网关的容器镜像 | distroless |
| `tooling/` | 版本检查等脚本 | Bash |

## 开发环境

| 部分 | 需要 | 常用命令（在对应目录下） |
|---|---|---|
| Rust 工作区 | rustup（版本由 `rust-toolchain.toml` 自动安装）；Linux 另需 `libwebkit2gtk-4.1-dev`、`libayatana-appindicator3-dev`、`librsvg2-dev`、`libxdo-dev`、`libssl-dev` | `cargo test --workspace`、`cargo clippy --workspace --all-targets` |
| Flutter 客户端 | Flutter（版本见 `apps/client/pubspec.yaml` 的 `environment.flutter`） | `flutter test`、`flutter run` |
| 前端（渲染页、桌面端） | Node.js 24、pnpm（版本见根目录 `package.json`） | 根目录 `pnpm install`、`pnpm -r run test` |
| 桌面端 | 以上 Rust 与前端环境；Windows 需 WebView2（Windows 10/11 自带） | `apps/desktop` 下 `pnpm tauri dev`、`pnpm tauri build` |
| 固件 | `cargo install espup ldproxy espflash`，然后 `espup install --targets esp32s3` | `cargo build --release`、`cargo run --release`（烧录并打开串口） |

固件编译的几点注意：

- `espup install` 会查询 GitHub API，匿名访问容易被限流；遇到限流时设置 `GITHUB_TOKEN` 后重试（例如 `GITHUB_TOKEN=$(gh auth token) espup install --targets esp32s3`）。
- espup 会生成 `export-esp.ps1`（Windows）或 `export-esp.sh`，新开的终端里要先执行它，设置 `LIBCLANG_PATH` 和 Xtensa 工具链路径。
- 第一次编译会把 ESP-IDF 及其工具（约 6 GB）下载到 `firmware/esp32/.embuild/`，网络中断时重新编译即可续上。
- Windows 上 ESP-IDF 要求输出路径很短：请把 `CARGO_TARGET_DIR` 设成短路径（例如 `C:\e32`），并把 `CARGO_WORKSPACE_DIR` 设成 `firmware/esp32` 的绝对路径；或者改在 WSL2 中编译。

## 贡献

所有改动都通过 Pull Request 合入 `main`，没有测试的代码不能合入。CI 会按改动范围运行对应检查，最后由 `CI OK` 汇总结果。

## 发版

1. 在一个 PR 中把下列文件里的版本号改成同一个新版本（`tooling/check-version.sh` 会检查它们是否一致）：
   - `Cargo.toml`（`[workspace.package]`）
   - `firmware/esp32/Cargo.toml`
   - `web/stage/package.json`
   - `apps/desktop/package.json`（`tauri.conf.json` 直接读取它的版本）
   - `apps/client/pubspec.yaml`（`+` 后的构建号需同时递增）
2. 合并后在 `main` 上打标签并推送，例如 `git tag v0.2.0 && git push origin v0.2.0`。预发布版本使用 `-alpha.N`、`-beta.N`、`-rc.N` 后缀。
3. 发版工作流会自动构建并发布：
   - 桌面端安装包：Windows（MSI、NSIS 安装程序）、macOS（arm64 与 x86_64 的 DMG）、Linux（x86_64 的 deb、rpm、AppImage，arm64 的 deb、rpm）；
   - 移动端 Android APK（按 CPU 架构拆分）、AAB 及符号表；
   - 节点与网关的二进制（Linux x86_64 / arm64、Windows、macOS arm64 / x86_64），用于不使用容器的自托管；
   - ESP32-S3 固件镜像（可直接在偏移 0 处烧录）；
   - `ghcr.io/nailongmeow/nl-node` 与 `nl-gateway` 多架构镜像（只有正式版会更新 `latest`）；
   - 校验和文件 `SHA256SUMS`、构建来源证明，以及按 Conventional Commits 生成的更新说明。

可以用 `gh attestation verify <文件> -R NaiLongMeow/NL` 验证下载的文件确实出自本仓库的发版流程。

目前尚未配置签名：Android 正式版用调试密钥签名，Windows 与 macOS 安装包未做代码签名（macOS 需在“隐私与安全性”中手动放行），iOS 构建只在 CI 中检查能否编译，暂不发布。

## 许可

[Apache-2.0](LICENSE)
