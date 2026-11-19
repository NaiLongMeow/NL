[简体中文](avatars.zh-CN.md) | English

# Avatars

An avatar is what NL's character looks like on the desktop pet. NL comes with one, a ball; you can add your own.

## Two modes

Settings > Desktop pet has two modes:

- **Light** shows the ball or an avatar of your own: one made of images (animated GIF, APNG, or WebP files, numbered frames, or sprite sheets), which uses very little, or one made of code, which uses what its code needs.
- **Live2D** shows an avatar with a Live2D model (Cubism 3 or later). It is livelier and uses more memory and graphics power.

Each mode remembers its own avatar. When the chosen avatar cannot show, the pet shows the same avatar's light-mode look, or the ball; it never shows nothing.

An avatar made of code is a small web page that draws the character any way it likes (vector graphics, canvas, WebGL) and follows what the character is doing: idle, working, waiting for you, happy, and so on. It is the freest kind of avatar: it can do what the others do, and more. An agent with the `nl-avatar` skill can write one for you or adapt one you have.

## Adding an avatar

Avatars are folders in NL's avatars folder, one folder per avatar, each with an `avatar.json` that says which picture shows when the character is idle, working, waiting for you, and so on. Settings > Desktop pet shows the folder, with buttons to open it and to reload the list.

| System | Avatars folder |
|---|---|
| Windows | `%LOCALAPPDATA%\dev.nailongmeow.nl\avatars` |
| macOS | `~/Library/Application Support/dev.nailongmeow.nl/avatars` |
| Linux | `~/.local/share/dev.nailongmeow.nl/avatars` (or under `$XDG_DATA_HOME`) |

**With an AI agent.** The easiest way. NL publishes an agent skill, `nl-avatar`, that teaches Claude Code, Codex, and other agents to turn your art into an avatar, check it, and install it. Add it to your agent:

```sh
npx skills add NaiLongMeow/NL --skill nl-avatar
```

or copy [skills/nl-avatar](../skills/nl-avatar) into your agent's skills folder (`~/.claude/skills` for Claude Code, `~/.agents/skills` for Codex). Then ask the agent, for example, "Import the pet GIFs in my Downloads folder into NL." It needs Node.js 22.18 or later.

**By hand.** Write the `avatar.json` yourself, following the [format](../skills/nl-avatar/references/format.md), check the folder with `node skills/nl-avatar/scripts/avatar.ts check <folder>` from a copy of this repository, and copy it into the avatars folder under the name of its `id`.

## What an avatar may contain

Images, JSON, Live2D model files (`.moc3`), sounds, and text; and for an avatar made of code, its page with scripts, styles, WebAssembly, and SVG. Nothing else is installed, executables least of all.

NL runs an avatar's code only in a sandbox. It can draw in the pet's window and load its own files, and nothing more: it cannot read your files, other avatars, or NL's data, keep anything between runs, use NL's functions, or send or receive anything over the network. One thing this sandbox does not stop: by pointing a frame at a web address, it can make your computer look up that address and open a connection to it, without sending anything over it, which a hostile avatar could use to signal that it is running. Install avatars made of code only from people you trust.

Use art and code you have the right to use, and say who made it and on what terms in `avatar.json`; NL shows both.

## Live2D

Live2D models need the Live2D Cubism runtime, which Live2D's license does not let NL ship. Live2D's terms for apps that load any model ("Expandable Applications") need Live2D's approval before release, so released versions of NL do not show Live2D yet; until they do, the same avatar's light-mode look, or the ball, shows instead. Developers can try Live2D in a development build by pointing `NL_DEV_LIVE2D_RUNTIME` at a runtime folder.
