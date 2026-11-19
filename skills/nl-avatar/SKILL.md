---
name: nl-avatar
description: Turns a user's character art into an avatar pack for NL (NaiLongMeow), the AI companion with a desktop pet, then checks it and installs it. Handles animated GIF, APNG, or WebP files, folders of PNG frames, sprite sheets, PNGtuber images, and Live2D models (.model3.json with .moc3). Use when the user wants to import, add, convert, or set up an avatar, a desktop pet look, or a Live2D model for NL, or asks why NL refuses one.
---

# NL avatar packs

An avatar pack is a folder with an `avatar.json` and the art it names. NL shows it as the desktop pet: the **light** rendition (images, cheap) in light mode, the **live2d** rendition (a Live2D model, heavier) in Live2D mode. The format is in [references/format.md](references/format.md); read it before writing a manifest.

The scripts need Node 22.18 or later (`node --version`); they use only Node's built-in modules. With an older Node, run them through `npx -y node@22 scripts/avatar.ts …` or ask the user to update Node. Paths below are relative to this skill's folder.

## Workflow

1. **Find the art.** Ask for the folder or files if the user has not said where they are. Never change the user's originals: build the pack in a new folder, such as `<original>-nl`, copying the files you need.
2. **Inventory it.** `node scripts/avatar.ts inspect <folder>` lists every image with its size and frame count, and every Live2D model with its expressions, motion groups, parameters (id, display name), hit areas, and moc3 version. Base the manifest on these facts, not on guesses from file names.
3. **Decide the renditions.** Images make a `light` rendition; a `.model3.json` with its `.moc3` makes a `live2d` rendition. One pack may have both, when the user has both kinds of art for the same character.
4. **Write `avatar.json`** at the pack's root, following references/format.md:
   - `id` from the character's name (`mochi`, `sea-slime`); `name` in the user's language, both languages if you know them.
   - `author`, `license`, `source`: what the user tells you or what the art's own readme or license file says. Ask when you do not know. Never invent them; write `unknown, personal use` rather than guess.
   - Map every state, expression, gesture, and pointer cue the art can show. `idle` is required; let the fallbacks cover the rest rather than reusing one animation everywhere.
5. **Check it.** `node scripts/avatar.ts check <pack>` must report no errors. Fix every error and read every warning; `--json` gives the same report for scripts.
6. **Install it.** `node scripts/avatar.ts install <pack>` checks again and copies the pack into NL's avatars folder (`node scripts/avatar.ts where` prints it; `--replace` overwrites an installed pack with the same id). Tell the user to open NL's Settings > Pet, press Reload, choose the mode, and pick the avatar.

## Adapting common kinds of art

- **Animated GIF, APNG, or WebP per state** (the usual desktop pet download): one `"image"` animation per file. Make `size` the files' common size. Map by what each file shows (sleeping, working, waving), and ask the user when the names say nothing.
- **Folders of numbered frames**: one `"frames"` animation per folder, the files in numeric order (`2` before `10`), with an `fps` that looks right (6 to 12 for most pets; ask, or try 8).
- **Sprite sheets**: work out the cell size from the image size and the number of frames per row and column; a sheet's grid is often in its file name (`walk_8x1.png`) or its readme. `size` is one cell. If you cannot tell the grid, ask.
- **Shimeji-style image sets** (`shime1.png` … with an `actions.xml`): read the XML to find which images form standing, sitting, dragging, and falling; standing is `idle`, dragged is `pointer.drag`. Leave out walking and climbing: NL's pet does not walk.
- **PNGtuber images** (idle, talking, blinking): idle as `idle`, talking as `speaking`, blinking as an idle extra every 3 to 8 seconds.
- **A Live2D model folder**: `model` is its `.model3.json`. Map expressions by what they show; names are often numbered or Japanese or Chinese (`02 smile`, `照れ`, `脸红`), so translate them, and say in your answer which ones you mapped and which you left out. Add `params` offsets only for parameter ids the inventory lists. Leave out expressions that switch outfits, watermarks, signatures, or other parts on and off.
- **A pack made for another app** (a `character.json`, `model.json`, or similar at the root): read it for the author, license, framing, and expression mapping, and carry over what fits this format. Do not copy its code.
- **Cubism 2 models** (`.moc` with `model.json`): NL cannot load them; the user must export the model again from Cubism Editor as Cubism 3 or later.

## Rules

- A pack holds data only. Never add scripts, HTML, or SVG, and never change the model's own files beyond copying them.
- Use only art the user has the right to use, and record what they told you about it in `author`, `license`, and `source`. Do not remove or hide an author's watermark or signature.
- Keep the user's art on their computer: do not upload it anywhere.
- Report what you did: the renditions, which cues you mapped to what, what you left out and why, and the checker's warnings.

## Live2D runtime

Live2D mode also needs the Live2D Cubism runtime (Cubism Core and the Cubism Web Framework), which NL does not ship and a pack cannot contain. For now only development builds of NL load one, from the folder in the `NL_DEV_LIVE2D_RUNTIME` environment variable; released builds wait until Live2D's terms for apps that load any model are settled. Settings > Pet says whether this NL can show Live2D. Tell the user when you import a Live2D model: if their NL cannot show it yet, a light rendition of the same character is what the pet can show meanwhile.
