# 为 NL 做贡献

[English](CONTRIBUTING.md) | 简体中文

感谢你对 NL 的关注。本指南说明如何提交改动，以及改动在合并前需要满足哪些要求。所有参与者都应遵守[行为准则](CODE_OF_CONDUCT.zh-CN.md)。

## 参与方式

- **报告 bug 或提出功能建议**：请在 [GitHub Issues](https://github.com/NaiLongMeow/NL/issues) 中提交，提交前先搜索是否已有相同的 issue。报告 bug 时请写明：你做了什么、预期结果、实际结果、版本或 commit、所用平台（操作系统、手机，或 ESP32-S3 模组等开发板），以及相关日志。
- **安全漏洞请私下报告**，不要提交公开 issue，见[安全政策](SECURITY.zh-CN.md)。
- **提交 Pull Request**：修复 bug、增加功能，或改进测试和文档。较大的改动（例如新组件、协议变更、引入新的外部服务）请先开 issue 讨论，确定方案后再动手。

## 语言

代码、标识符、注释、提交信息、PR 标题，以及 `.agents/` 下的 agent 记录统一使用英文，这样每位贡献者和他们的编码 agent 都能阅读和搜索。

Issue、PR 描述和代码审查中的讨论可以用英文或中文。英文能让更多人参与进来，条件允许时请尽量使用英文。

## 搭建环境

各部分需要的工具链，以及构建和测试命令，见 README 的[开发环境](README.zh-CN.md#开发环境)一节。

## 提交改动

1. 从最新的 `main` 拉分支；没有写权限的贡献者请先 fork。每个改动单独一个分支。
2. 每个 PR 只包含一项完整的改动，便于单独审查，必要时也能单独回滚。无关的修复请另开 PR。
3. 提交信息采用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) 格式，例如 `fix(desktop): place the pet from its configured size` 或 `docs: explain asset pack limits`。发版说明由这些提交信息自动生成。
4. 请求审查前，先把分支更新到最新的 `main` 并解决冲突。
5. 按 PR 模板填写：改了什么、为什么改、怎么测试的。

## 测试

没有测试的代码不能合入。每个改变行为的改动都要附带能覆盖它的自动化测试，并且在提交 PR 前测试已经通过。很多人同时基于 `main` 开发，一个未经测试的改动就可能让所有人的工作受阻。

与硬件相关的代码也不例外：在主机或模拟器上测试其逻辑，并在 PR 中说明哪些部分仍需在真实设备上验证。

推送前请运行你改动部分的检查，CI 运行的是同样的命令：

| 部分 | 检查 |
|---|---|
| Rust 工作区 | `cargo fmt --all --check`、`cargo clippy --workspace --all-targets --locked -- -D warnings`、`cargo test --workspace --locked` |
| 固件（`firmware/esp32`） | `cargo build --release --locked`；在仓库根目录运行 `rustfmt --check --edition 2024 firmware/esp32/build.rs firmware/esp32/src/main.rs` |
| Flutter 客户端（`apps/client`） | 先在仓库根目录运行 `node web/tokens/src/cli.ts` 生成设计令牌；然后 `dart format --output=none --set-exit-if-changed .`、`flutter analyze --fatal-infos`、`flutter test` |
| Web 包（`web/`、`apps/desktop`） | 在仓库根目录运行 `pnpm -r run typecheck`、`pnpm -r run test`、`pnpm -r run build` |
| 桌面端（`apps/desktop`） | `pnpm tauri build` |
| 协议（`proto/`） | `buf lint`、`buf format --diff --exit-code` |
| 版本号（`tooling/`） | `bash tooling/check-version.test.sh`、`bash tooling/check-version.sh` |

## 代码风格

- 以格式化工具为准：Rust 用 rustfmt，Dart 用 `dart format`。TypeScript 必须通过类型检查。
- 注释要写充分。这里的代码既给人读，也给编码 agent 读，请解释代码本身体现不出的原因、约束和不变量。不要在注释里记录改动的经过，那属于提交信息。
- 只在确有必要时引入新依赖，并确认其许可证与 Apache-2.0 兼容。

## 审查与合并

`main` 只接受通过 PR 合入的改动。PR 满足以下条件后才能合并：

- `CI OK` 检查通过。CI 只运行与改动路径相关的任务，由 `CI OK` 汇总结果；
- 至少一位维护者批准。推送新提交后，之前的批准会失效。

任何人都不能强推或删除 `main`。仓库管理员可以绕过 PR 和 CI 要求，仅用于 CI 本身出故障等紧急情况。

## AI 辅助的贡献

欢迎借助 AI 编码工具完成的贡献，NL 本身很大一部分就是这样开发的。无论使用什么工具，你都要对提交的内容负责：

- 读懂改动的每一行，能在审查中解释它。
- 亲自运行测试并检查实际行为，不要提交未经验证的生成结果。
- 确认生成的代码和内容没有照搬与 Apache-2.0 不兼容的许可下的材料。

不需要标注哪些部分由 AI 辅助完成。在本仓库工作的编码 agent 遵循 [AGENTS.md](AGENTS.md)，并把记录保存在 `.agents/` 下。

## 素材与第三方内容

只提交你有权以 Apache-2.0 授权的内容，并注明来源。许可受限的角色模型和运行库（尤其是 Live2D）一律不进仓库，而是作为独立素材包分发，详见 [docs/architecture.md](docs/architecture.md)。

## 文档与翻译

英文文档是基准版本。`README.md`、`CONTRIBUTING.md`、`SECURITY.md` 旁边各有一份简体中文译文（`*.zh-CN.md`）。修改有译文的文档时，请在同一个 PR 中同步更新译文；如果你不会写另一种语言，请在 PR 中说明，由维护者跟进。行为准则的译文取自 Contributor Covenant 官方。`docs/` 下的文档目前只有中文版。

## 许可

NL 以 [Apache License 2.0](LICENSE) 授权。除非你明确声明另有约定，你有意提交以纳入 NL 的任何贡献（按 Apache-2.0 许可证中的定义）均按上述许可授权，不附加任何其他条款或条件。无需签署贡献者许可协议（CLA），也无需在提交中签名（sign-off）。

## 发版

发版由维护者负责，流程见 README 的[发版](README.zh-CN.md#发版)一节。
