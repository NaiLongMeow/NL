# NL avatar pack format, version 1

An **avatar pack** gives NL's character a look of the user's choosing. It is a folder with an `avatar.json` manifest at its root and the files the manifest names. It has one or both of two renditions:

- **light**: images (still or animated GIF, APNG, WebP, or frames and sprite sheets). Cheap to run; shown in the pet's light mode.
- **live2d**: a Live2D model (Cubism 3 or later: `.model3.json`, `.moc3`, textures, and the model's own expression, motion, physics, and pose files). Heavier; shown in the pet's Live2D mode.

NL never runs anything from a pack: a pack holds data only. The checker (`node scripts/avatar.ts check <folder>`) applies every rule below; `scripts/lib/format.ts` is the same rules as code.

## Files

- Allowed extensions: `json`, `moc3`, `png`, `jpg`, `jpeg`, `webp`, `gif`, `wav`, `mp3`, `txt`, `md`. Anything else (scripts, HTML, SVG, PSD, Cubism Editor files) is left out when the pack is installed. Rename a license file such as `LICENSE` to `LICENSE.txt` to keep it.
- At most 4000 files and 400 MiB in total; `avatar.json` at most 256 KiB.
- Paths in the manifest are relative to `avatar.json`, use forward slashes, and match the file names exactly, letter case included. No `..`, no leading `/`, no drive letters. Two files whose names differ only in case are refused.
- Symbolic links are left out.

## avatar.json

```json
{
  "nlAvatar": 1,
  "id": "mochi",
  "name": { "en": "Mochi", "zh-CN": "麻糬" },
  "author": "Jane Doe",
  "license": "CC BY 4.0",
  "source": "https://example.com/mochi",
  "icon": "icon.png",
  "light": { },
  "live2d": { }
}
```

| Key | Required | Meaning |
|---|---|---|
| `nlAvatar` | yes | The format version: `1`. |
| `id` | yes | 1 to 64 lowercase letters, digits, and single hyphens. The pack's folder name once installed; installing a pack with the same id replaces the old one. |
| `name` | yes | The name NL shows: text, or an object of language tags (`en`, `zh-CN`, …) to text, 1 to 64 characters each. |
| `author` | no, but warned | Who made the art. |
| `license` | no, but warned | Under what terms it may be used, as known: `CC BY 4.0`, `personal use, with the author's permission`, `unknown, personal use`. NL shows it. |
| `source` | no | Where it came from: a URL or a short note. |
| `icon` | no | A small image for lists, preferably square. |
| `light`, `live2d` | at least one | The renditions, below. |

Unknown keys are ignored with a warning.

## Cues

NL tells the avatar what the character is doing with cue names, never with file names. A pack maps the names it has art for:

- **States**, set by what the harness is doing: `idle`, `listening`, `thinking`, `working`, `speaking`, `approval` (waiting for the user's approval), `question` (waiting for the user's answer), `device` (waiting for a device to come online), `sleeping` (quiet hours), `offline`, `error`.
- **Expressions**, sent with a message: `neutral` (none), `happy`, `excited`, `sad`, `worried`, `surprised`, `shy`, `pouting`.
- **Gestures**, played once: `nod`, `shake`, `wave`, `tilt`, `bounce`.
- **Pointer**, what the user does to the avatar: `hover`, `press`, `drag`.

A state without its own look falls back along this chain, and every chain ends at `idle`, which is required:

| State | Falls back to |
|---|---|
| `thinking` | `working`, `idle` |
| `approval` | `question`, `idle` |
| `question` | `approval`, `idle` |
| `device` | `sleeping`, `idle` |
| `offline` | `sleeping`, `idle` |
| every other | `idle` |

A missing expression, gesture, or pointer look simply shows the current state.

## The light rendition

```json
"light": {
  "size": [256, 256],
  "anchor": [128, 248],
  "pixelated": false,
  "animations": {
    "idle":  { "frames": ["idle/01.png", "idle/02.png", "idle/03.png"], "fps": 6 },
    "blink": { "sheet": "blink.png", "columns": 4, "count": 4, "fps": 12, "loop": false },
    "work":  { "image": "working.gif" },
    "happy": { "image": "happy.webp" },
    "poke":  { "frames": ["poke/1.png", "poke/2.png"], "fps": 10, "loop": false }
  },
  "states": { "idle": "idle", "working": "work", "thinking": "work" },
  "idleExtras": [{ "animation": "blink", "every": [3, 8] }],
  "expressions": { "happy": "happy" },
  "gestures": {},
  "pointer": { "hover": "poke", "press": "poke" }
}
```

| Key | Required | Meaning |
|---|---|---|
| `size` | yes | `[width, height]` of one frame in pixels, 16 to 2048. Every frame is drawn into this box; images of another size are scaled to fit it. |
| `anchor` | no | `[x, y]` in frame pixels: the point that stands on the ground. Bottom center when absent. |
| `pixelated` | no | `true` to scale with hard pixel edges, for pixel art. |
| `animations` | yes | 1 to 200 named animations. Names use letters, digits, `_` and `-`. |
| `states` | yes | Animation per state; `idle` is required. |
| `idleExtras` | no | Up to 20 `{ "animation", "every": [min, max] }`: while idle, the animation plays once every `min` to `max` seconds (1 to 3600), such as a blink or a yawn. |
| `expressions`, `gestures`, `pointer` | no | Animation per cue name. |

An animation has exactly one of:

- `"frames": ["a.png", "b.png", …]`: 1 to 600 image files, shown in order. Sort numbered files by number, not as text (`2` before `10`).
- `"sheet": "sheet.png", "columns": C, "count": N`: one image holding N frames of `size`, C to a row, read row by row from the top left. The image must be at least `C × width` wide and `ceil(N / C) × height` tall.
- `"image": "anim.gif"`: one image, still or animated (GIF, APNG, animated WebP), shown as it is. NL cannot restart or time an animated image, so prefer frames or a sheet for short, one-time animations.

`fps` (1 to 60, default 8) sets the speed of `frames` and `sheet`. `loop` (default `true`) says whether a state's animation starts over at its end or stays on its last frame. Gestures, `press`, and idle extras always play once.

What shows, highest first: `drag`, `press`, a gesture, `hover`, an expression, an idle extra, the state.

## The Live2D rendition

```json
"live2d": {
  "model": "model/mochi.model3.json",
  "framing": { "zoom": 1.1, "y": 0.05 },
  "parameters": { "angleX": "PARAM_ANGLE_X" },
  "base": { "expression": "outfit-summer" },
  "states": {
    "working":  { "expression": "focused", "params": { "ParamEyeSmile": 0.2 } },
    "approval": { "expression": "hopeful" },
    "device":   { "params": { "ParamEyeLOpen": -0.7, "ParamEyeROpen": -0.7 } }
  },
  "expressions": {
    "happy": { "expression": "smile", "params": { "ParamEyeSmile": 0.7 } },
    "shy":   { "expression": "blush" }
  },
  "gestures": { "wave": { "motion": "Wave" } },
  "pointer": { "press": { "expression": "surprised" } }
}
```

| Key | Required | Meaning |
|---|---|---|
| `model` | yes | The `.model3.json` file. The files it names are found relative to it and must be in the pack. |
| `framing` | no | NL fits the whole model into the window. `zoom` (0.1 to 10) scales that fit; `x` and `y` (-1 to 1) move it by fractions of the window, positive meaning right and up. |
| `parameters` | no | The model's parameter ids for the standard controls, when they are not the usual ones: `angleX` (`ParamAngleX`), `angleY`, `angleZ`, `bodyAngleX`, `eyeLOpen`, `eyeROpen`, `eyeBallX`, `eyeBallY`, `mouthOpenY`, `breath`. |
| `base` | no | A pose kept under every other one. |
| `states`, `expressions`, `pointer` | no | A pose per cue name. |
| `gestures` | no | `{ "motion": "<motion group>" }` per gesture. Without one, `nod`, `shake`, `tilt`, and `bounce` use built-in head and body movements, and `wave` does nothing. |

A **pose** has one or more of:

- `expression`: the `Name` of an expression in the model's `FileReferences.Expressions`.
- `motion`: the name of a motion group in the model's `FileReferences.Motions`; one of its motions plays.
- `params`: offsets added to parameters by id, kept within each parameter's range. The checker verifies the ids against the model's `.cdi3.json` when it has one.

NL animates the standard controls itself: it blinks (with the parameters of the model's `EyeBlink` group when it has one), breathes, turns the head and eyes toward the pointer, and moves the mouth while speaking (the `LipSync` group). Poses add to that: `base`, then the state, then the expression; an expression's own `expression` replaces the state's.

Do not map outfit, watermark, or signature switches to cues, and do not use a pose to hide an author's watermark or signature.

## Installing

NL looks for packs in the `avatars` folder of its local data folder, one folder per pack, named after its `id`:

| System | Folder |
|---|---|
| Windows | `%LOCALAPPDATA%\dev.nailongmeow.nl\avatars` |
| macOS | `~/Library/Application Support/dev.nailongmeow.nl/avatars` |
| Linux | `$XDG_DATA_HOME/dev.nailongmeow.nl/avatars`, or `~/.local/share/dev.nailongmeow.nl/avatars` |

`node scripts/avatar.ts install <folder>` checks the pack and copies its allowed files there. NL also shows this folder under Settings > Pet, with Open folder and Reload. The user then picks the avatar there: light avatars in light mode, Live2D avatars in Live2D mode.

Live2D mode also needs the Live2D Cubism runtime, which NL does not ship and a pack cannot contain (see the skill's notes on Live2D).
