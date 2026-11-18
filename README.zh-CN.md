# NL

[English](README.md) | 简体中文

> 海内存知己，天涯若比邻。
>
> ——王勃《送杜少府之任蜀州》

NL（NaiLongMeow）是一个开源的分布式 agent harness，以陪伴与娱乐为本。同一个角色可以同时住在你的电脑、手机，以及书架上的一块 ESP32 里；无论在哪一端，它都记得你。它可编程，但首先是一个伙伴。

**现状**：合抱之木，生于毫末，本项目尚在“毫末”阶段。目前只有各端的项目骨架、CI 和发版流程，还没有可用功能。

## 设计要点

> 穷则变，变则通，通则久。
>
> ——《周易·系辞下》

以下方向已经定下，大部分尚未实现，详细的考量见 [docs/architecture.md](docs/architecture.md)。

- **一个角色，多处化身**：桌面、手机、单片机说同一套协议，各自声明能力；任何一端都可以单独替换或重写。
- **轻重分离**：鹪鹩巢于深林，不过一枝。ESP32 只管传感、执行和音频收发；LLM 推理、语音识别与合成、长期记忆、子代理这些重活交给算力更强的节点。桌面与云端运行同一个 `nl-node`，按声明的能力分工，而不是按设备类型写死角色。
- **先直连，后中继**：两个节点之间依次尝试局域网、公网直连、端口映射和打洞，全部走不通才经网关中继；单片机只尝试局域网和中继两种方式。
- **隐私默认开启**：节点之间端到端加密，即使走中继，网关也看不到对话内容；API key 只保存在网关，永远不下发到设备。
- **角色即素材包**：角色模型以独立、可校验的素材包分发；Live2D 的运行库属于专有软件，一律不进本仓库。

## 仓库结构

> 不以规矩，不能成方圆。
>
> ——《孟子·离娄上》

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
| `web/tokens` | Web 端的设计令牌，以及在构建时为各平台生成令牌文件的生成器 | TypeScript |
| `design/` | 设计令牌：所有界面的颜色、字体、间距与动效的唯一来源 | JSON（W3C 设计令牌格式） |
| `firmware/esp32` | ESP32-S3 固件 | Rust + ESP-IDF |
| `docker/` | 节点与网关的容器镜像 | distroless |
| `tooling/` | 版本检查等脚本 | Bash |

## 开发环境

> 工欲善其事，必先利其器。
>
> ——《论语·卫灵公》

| 部分 | 需要 | 常用命令（在对应目录下） |
|---|---|---|
| Rust 工作区 | rustup（版本由 `rust-toolchain.toml` 自动安装）；Linux 另需 `libwebkit2gtk-4.1-dev`、`libayatana-appindicator3-dev`、`librsvg2-dev`、`libxdo-dev`、`libssl-dev` | `cargo test --workspace`、`cargo clippy --workspace --all-targets` |
| Flutter 客户端 | Flutter（版本见 `apps/client/pubspec.yaml` 的 `environment.flutter`）；生成设计令牌需要 Node.js 24 | 克隆后以及 `design/tokens.json` 改动后，在仓库根目录运行 `node web/tokens/src/cli.ts`（无需 `pnpm install`）；然后 `flutter test`、`flutter run` |
| Web 包（设计令牌、渲染页、桌面端） | Node.js 24、pnpm（版本见根目录 `package.json`） | 根目录 `pnpm install`、`pnpm -r run test`；各脚本会自行生成设计令牌 |
| 桌面端 | 以上 Rust 与前端环境；Windows 需 WebView2（Windows 10/11 自带） | `apps/desktop` 下 `pnpm tauri dev`、`pnpm tauri build` |
| 固件 | `cargo install espup ldproxy espflash`，然后 `espup install --targets esp32s3` | `cargo build --release`、`cargo run --release`（烧录并打开串口） |

固件编译的几点注意：

- `espup install` 会查询 GitHub API，匿名访问容易被限流；遇到限流时设置 `GITHUB_TOKEN` 后重试（例如 `GITHUB_TOKEN=$(gh auth token) espup install --targets esp32s3`）。
- espup 会生成 `export-esp.ps1`（Windows）或 `export-esp.sh`，新开的终端里要先执行它，设置 `LIBCLANG_PATH` 和 Xtensa 工具链路径。
- 第一次编译会把 ESP-IDF 及其工具（约 6 GB）下载到 `firmware/esp32/.embuild/`，网络中断时重新编译即可续上。
- Windows 上 ESP-IDF 要求输出路径很短：请把 `CARGO_TARGET_DIR` 设成短路径（例如 `C:\e32`），并把 `CARGO_WORKSPACE_DIR` 设成 `firmware/esp32` 的绝对路径；或者改在 WSL2 中编译。

## 贡献

> 他山之石，可以攻玉。
>
> ——《诗经·小雅·鹤鸣》

欢迎各位以他山之石，共琢此玉。提交改动前请阅读[贡献指南](CONTRIBUTING.zh-CN.md)，参与社区请遵守[行为准则](CODE_OF_CONDUCT.zh-CN.md)。安全漏洞请按[安全政策](SECURITY.zh-CN.md)私下报告，不要提交公开 issue。

## 发版

> 十年磨一剑，霜刃未曾试。\
> 今日把示君，谁有不平事？
>
> ——贾岛《剑客》

剑磨好了，才“把示君”：各处版本号一致、CI 全部通过，就可以打标签发版，其余交给流水线。发版之后若有“不平事”，欢迎提 issue。

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

> 指穷于为薪，火传也，不知其尽也。
>
> ——《庄子·养生主》

NL 以 [Apache License 2.0](LICENSE) 授权，薪尽而火传。除非另行声明，你提交的贡献同样按 Apache-2.0 授权，详见[贡献指南](CONTRIBUTING.zh-CN.md#许可)。
