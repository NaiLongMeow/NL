简体中文 | [English](avatars.md)

# 形象

形象就是 NL 的角色在桌宠上的样子。NL 自带一个小球，你也可以加入自己的形象。

## 两种模式

设置 > 桌宠里有两种模式：

- **轻量**：显示小球，或你导入的形象。图片形象（GIF、APNG、WebP 动图，编号的序列帧，精灵图）几乎不占资源；代码形象的占用取决于它的代码。
- **Live2D**：显示带 Live2D 模型（Cubism 3 及以上）的形象。更生动，也更占内存和显卡。

两种模式各自记住自己选的形象。选中的形象无法显示时，桌宠改为显示该形象在轻量模式下的样子，或小球，不会什么都不显示。

代码形象是一个小网页，用任何方式画出角色（矢量图形、canvas、WebGL 都行），并跟着角色的状态变化：闲置、工作、等你回应、开心等等。它是最自由的一种形象，别的形象能做的它都能做，还能做更多。装了 `nl-avatar` skill 的 AI 助手可以替你写一个，或把你已有的改造过来。

## 加入形象

形象放在 NL 的形象文件夹里，一个形象一个文件夹，每个文件夹里有一份 `avatar.json`，写明角色闲置、工作、等你回应等各种状态下显示哪张图。设置 > 桌宠会显示这个文件夹的位置，并提供打开文件夹和重新加载的按钮。

| 系统 | 形象文件夹 |
|---|---|
| Windows | `%LOCALAPPDATA%\dev.nailongmeow.nl\avatars` |
| macOS | `~/Library/Application Support/dev.nailongmeow.nl/avatars` |
| Linux | `~/.local/share/dev.nailongmeow.nl/avatars`（或 `$XDG_DATA_HOME` 下） |

**让 AI 助手导入。** 这是最省事的办法。NL 提供一个 agent skill：`nl-avatar`，它教 Claude Code、Codex 等 AI 助手把你的素材做成形象、检查并安装。先把它加到你的助手里：

```sh
npx skills add NaiLongMeow/NL --skill nl-avatar
```

也可以把 [skills/nl-avatar](../skills/nl-avatar) 复制到助手的 skill 文件夹（Claude Code 是 `~/.claude/skills`，Codex 是 `~/.agents/skills`）。然后对助手说，比如“把下载文件夹里的桌宠 GIF 导入 NL”。它需要 Node.js 22.18 或更高版本。

**手动导入。** 按照[格式说明](../skills/nl-avatar/references/format.md)（英文）自己写 `avatar.json`，在本仓库的副本里用 `node skills/nl-avatar/scripts/avatar.ts check <文件夹>` 检查，再把文件夹以它的 `id` 为名复制进形象文件夹。

## 形象里能放什么

图片、JSON、Live2D 模型文件（`.moc3`）、声音和文本；代码形象还可以放它的网页，以及脚本、样式、WebAssembly 和 SVG。其他文件一律不会安装，可执行文件更不会。

NL 只在沙箱里运行形象的代码。它能在桌宠窗口里绘制、读取自己的文件，仅此而已：读不到你的文件、别的形象和 NL 的数据，存不下任何东西，用不了 NL 的功能，也无法通过网络收发任何内容。有一件事这个沙箱拦不住：只要让一个框架指向某个网址，它就能让你的电脑解析这个网址并与之建立连接，虽然不发送任何内容，恶意形象却可以借此传出“我正在运行”之类的信号。代码形象只从你信任的人那里获取。

请只用你有权使用的素材和代码，并在 `avatar.json` 里写明作者和授权条件，NL 会显示这两项。

## Live2D

Live2D 模型需要 Live2D Cubism 运行库，而 Live2D 的许可不允许 NL 随附它。对于能加载任意模型的应用（“扩展性应用”），Live2D 要求发布前取得其批准，所以 NL 的正式版暂时不显示 Live2D；在此之前，会改为显示该形象在轻量模式下的样子，或小球。开发者可以在开发版中把 `NL_DEV_LIVE2D_RUNTIME` 指向一个运行库文件夹来试用 Live2D。
