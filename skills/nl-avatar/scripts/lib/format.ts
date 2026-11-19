/**
 * The NL avatar pack format, version 1: the executable form of the rules in
 * ../../references/format.md.
 *
 * An avatar pack is a folder with an `avatar.json` manifest and the files it
 * names: images for the light rendition, a Live2D model for the Live2D
 * rendition, or both. This module checks a manifest against the list of
 * files in its pack, and a Live2D model's `.model3.json` against the same
 * list. It reads no files itself and depends on nothing but the language, so
 * that three places run the very same rules: the skill's command-line
 * checker under plain Node (pack.ts), the desktop app's main window when it
 * lists the installed avatars, and the stage renderer when it loads one.
 *
 * Every problem is reported as an Issue with a stable `code`, the place in
 * the manifest it concerns (`at`, such as `light.animations.idle.frames[2]`),
 * and an English message written for the agent or person who fixes it.
 * Errors make a pack unusable; warnings do not.
 */

import rules from "./rules.json" with { type: "json" };

/** The manifest's file name, at the root of the pack. */
export const MANIFEST = rules.manifest;

/** The format version this code reads and writes. */
export const FORMAT_VERSION = 1;

/** Extensions allowed in a pack (lowercase, without the dot). */
export const EXTENSIONS: readonly string[] = rules.extensions;

/** Extensions the light rendition may use for its frames and images. */
export const IMAGE_EXTENSIONS: readonly string[] = rules.imageExtensions;

/** Upper bounds on a pack, which keep a broken or hostile pack from exhausting storage. */
export const LIMITS = {
  totalBytes: rules.maxTotalBytes,
  files: rules.maxFiles,
  manifestBytes: rules.maxManifestBytes,
} as const;

// ---------------------------------------------------------------------------
// The cue vocabulary (UI design note, section 10). Packs map these names to
// their own animations, expressions, and motions; the harness never names a
// file or a motion itself (architecture invariant P8).

/** States, derived from what the harness is doing. */
export const STATES = [
  "idle",
  "listening",
  "thinking",
  "working",
  "speaking",
  "approval",
  "question",
  "device",
  "sleeping",
  "offline",
  "error",
] as const;
export type State = (typeof STATES)[number];

/** Expressions, chosen by the model with a message. "neutral" means no expression. */
export const EXPRESSIONS = ["neutral", "happy", "excited", "sad", "worried", "surprised", "shy", "pouting"] as const;
export type Expression = (typeof EXPRESSIONS)[number];

/** Gestures, chosen by the model; each plays once. */
export const GESTURES = ["nod", "shake", "wave", "tilt", "bounce"] as const;
export type Gesture = (typeof GESTURES)[number];

/** What the user's pointer is doing to the avatar. */
export const POINTER = ["hover", "press", "drag"] as const;
export type Pointer = (typeof POINTER)[number];

/**
 * Where each state goes when a pack has no look of its own for it, nearest
 * first. Every chain ends at idle, which every pack must have, so a pack
 * that maps only idle still shows something sensible in every state.
 */
export const STATE_FALLBACKS: Readonly<Record<State, readonly State[]>> = {
  idle: [],
  listening: ["idle"],
  thinking: ["working", "idle"],
  working: ["idle"],
  speaking: ["idle"],
  approval: ["question", "idle"],
  question: ["approval", "idle"],
  device: ["sleeping", "idle"],
  sleeping: ["idle"],
  offline: ["sleeping", "idle"],
  error: ["idle"],
};

/** The entry `map` has for `state`, or for the nearest state it falls back to. */
export function resolveState<T>(map: Partial<Record<State, T>>, state: State): T | undefined {
  if (map[state] !== undefined) return map[state];
  for (const next of STATE_FALLBACKS[state]) {
    if (map[next] !== undefined) return map[next];
  }
  return undefined;
}

/**
 * The standard controls the Live2D renderer drives on its own (blinking,
 * breathing, following the pointer, moving the mouth while speaking), with
 * the parameter ids most models use for them. A pack whose model uses other
 * ids maps them in `live2d.parameters`.
 */
export const LIVE2D_CONTROLS = {
  angleX: "ParamAngleX",
  angleY: "ParamAngleY",
  angleZ: "ParamAngleZ",
  bodyAngleX: "ParamBodyAngleX",
  eyeLOpen: "ParamEyeLOpen",
  eyeROpen: "ParamEyeROpen",
  eyeBallX: "ParamEyeBallX",
  eyeBallY: "ParamEyeBallY",
  mouthOpenY: "ParamMouthOpenY",
  breath: "ParamBreath",
} as const;
export type Live2DControl = keyof typeof LIVE2D_CONTROLS;

// ---------------------------------------------------------------------------
// The manifest's shape, once checked.

/** A name to show, either one string or one per language tag ("en", "zh-CN"). */
export type LocalizedText = string | Readonly<Record<string, string>>;

export interface AvatarManifest {
  nlAvatar: 1;
  /** Lowercase letters, digits, and single hyphens; the pack's folder name once installed. */
  id: string;
  name: LocalizedText;
  author?: string;
  license?: string;
  source?: string;
  /** A small, preferably square image for lists. */
  icon?: string;
  light?: LightRendition;
  live2d?: Live2DRendition;
}

/** One animation of the light rendition: exactly one of `frames`, `sheet`, or `image`. */
export interface LightAnimation {
  /** Image files shown in order. */
  frames?: string[];
  /** One image holding the frames in a grid of `size` cells, row by row from the top left. */
  sheet?: string;
  /** How many cells a row of the sheet has. */
  columns?: number;
  /** How many frames the sheet holds. */
  count?: number;
  /** One image, still or animated (GIF, APNG, animated WebP), shown as it is. */
  image?: string;
  /** Frames per second for `frames` and `sheet`; 8 when absent. */
  fps?: number;
  /** Whether a state's animation starts over at the end (true when absent) or stays on its last frame. */
  loop?: boolean;
}

export interface LightRendition {
  /** Width and height of one frame, in pixels. */
  size: [number, number];
  /** The point of a frame that stands on the ground, in frame pixels; the bottom center when absent. */
  anchor?: [number, number];
  /** Scale with hard pixel edges, for pixel art. */
  pixelated?: boolean;
  animations: Record<string, LightAnimation>;
  /** Animation per state; idle is required. */
  states: Partial<Record<State, string>> & { idle: string };
  /** Animations that play now and then while idle, once each, every `every[0]` to `every[1]` seconds. */
  idleExtras?: { animation: string; every: [number, number] }[];
  expressions?: Partial<Record<Expression, string>>;
  gestures?: Partial<Record<Gesture, string>>;
  pointer?: Partial<Record<Pointer, string>>;
}

/** A Live2D look: an expression of the model, a motion group of the model, parameter offsets, or several. */
export interface Live2DPose {
  /** The `Name` of one of the model's expressions. */
  expression?: string;
  /** The name of one of the model's motion groups; one of its motions plays. */
  motion?: string;
  /** Offsets added to parameters, by parameter id, kept within each parameter's range. */
  params?: Record<string, number>;
}

export interface Live2DRendition {
  /** The `.model3.json` file. */
  model: string;
  /** Adjusts the automatic fit: `zoom` scales it, `x` and `y` move it by fractions of the window. */
  framing?: { zoom?: number; x?: number; y?: number };
  /** Parameter ids for the standard controls, where the model does not use the usual ones. */
  parameters?: Partial<Record<Live2DControl, string>>;
  /** A pose kept under every other one. */
  base?: Live2DPose;
  states?: Partial<Record<State, Live2DPose>>;
  expressions?: Partial<Record<Expression, Live2DPose>>;
  /** A motion group per gesture; nod, shake, tilt, and bounce have built-in movements when absent. */
  gestures?: Partial<Record<Gesture, { motion: string }>>;
  pointer?: Partial<Record<Pointer, Live2DPose>>;
}

// ---------------------------------------------------------------------------
// Issues.

export type IssueCode =
  /** A value has the wrong type, shape, or range. */
  | "invalid"
  /** A required field is absent. */
  | "missing"
  /** A key the format does not know; ignored. */
  | "unknown-key"
  /** The manifest names a file the pack does not have (names are case-sensitive). */
  | "missing-file"
  /** A file of the wrong type for where it is used. */
  | "wrong-file-type"
  /** A name that refers to nothing: an animation, or the model's expression, motion group, or parameter. */
  | "unknown-name"
  /** The manifest says nothing about who made the art or under what terms it may be used. */
  | "metadata"
  /** A file the pack may not contain, or a path that is not safe. */
  | "file-not-allowed"
  /** Two paths that differ only in letter case, which clash on Windows and macOS. */
  | "case-clash"
  /** The pack is larger than the limits. */
  | "too-large"
  /** A file's content is not what its name says, or cannot be read. */
  | "unreadable";

export interface Issue {
  level: "error" | "warning";
  /** Where in the manifest (dotted path), or the file the issue is about. */
  at: string;
  code: IssueCode;
  message: string;
}

/** Collects issues while a check walks the manifest. */
class Report {
  readonly issues: Issue[] = [];
  error(at: string, code: IssueCode, message: string) {
    this.issues.push({ level: "error", at, code, message });
  }
  warn(at: string, code: IssueCode, message: string) {
    this.issues.push({ level: "warning", at, code, message });
  }
  get failed(): boolean {
    return this.issues.some((issue) => issue.level === "error");
  }
}

// ---------------------------------------------------------------------------
// Paths.

/**
 * A relative path that stays inside the pack on every operating system:
 * forward slashes only, no empty, "." or ".." segments, no drive letters,
 * backslashes, or NUL bytes. The same rule as `crates/nl-assets`.
 */
export function isSafePath(path: string): boolean {
  return (
    path.length > 0 &&
    !path.startsWith("/") &&
    !path.includes("\\") &&
    !path.includes(":") &&
    !path.includes("\0") &&
    path.split("/").every((part) => part.length > 0 && part !== "." && part !== "..")
  );
}

/** The lowercase extension of a path's file name, or null for none (".hidden" has none). */
export function extensionOf(path: string): string | null {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : null;
}

/** Whether a pack may contain a file at `path`. */
export function isAllowedFile(path: string): boolean {
  const extension = extensionOf(path);
  return isSafePath(path) && extension !== null && EXTENSIONS.includes(extension);
}

function isImagePath(path: string): boolean {
  const extension = extensionOf(path);
  return extension !== null && IMAGE_EXTENSIONS.includes(extension);
}

/**
 * Resolves `reference`, relative to the folder `base` inside the pack, to a
 * pack path; null when it is malformed or leaves the pack. Live2D models
 * name their files relative to the `.model3.json`.
 */
export function joinPackPath(base: string, reference: string): string | null {
  if (reference.length === 0 || reference.startsWith("/") || reference.includes("\\") || reference.includes(":")) {
    return null;
  }
  const parts = base === "" ? [] : base.split("/");
  for (const part of reference.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (parts.length === 0) return null;
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  const joined = parts.join("/");
  return isSafePath(joined) ? joined : null;
}

/** The folder part of a pack path ("" at the root). */
export function folderOf(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash < 0 ? "" : path.slice(0, slash);
}

// ---------------------------------------------------------------------------
// Small shape checks.

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isInteger(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

/** Warns about keys of `object` that the format does not define; they are ignored. */
function checkKeys(object: Record<string, unknown>, known: readonly string[], at: string, report: Report) {
  for (const key of Object.keys(object)) {
    if (!known.includes(key)) {
      report.warn(join(at, key), "unknown-key", `"${key}" is not part of the format and is ignored. Known keys: ${known.join(", ")}.`);
    }
  }
}

function join(at: string, key: string | number): string {
  if (typeof key === "number") return `${at}[${key}]`;
  return at === "" ? key : `${at}.${key}`;
}

/** An optional text field: absent, or a string of 1 to `max` characters. */
function checkText(object: Record<string, unknown>, key: string, at: string, max: number, report: Report) {
  const value = object[key];
  if (value === undefined) return;
  if (typeof value !== "string" || value.trim().length === 0 || value.length > max) {
    report.error(join(at, key), "invalid", `"${key}" must be text of 1 to ${max} characters.`);
  }
}

/** A file the manifest names: it must be in the pack, with its exact case, and of an allowed kind. */
function checkFile(value: unknown, at: string, files: ReadonlySet<string>, report: Report, kind: "image" | "model"): value is string {
  if (typeof value !== "string" || value.length === 0) {
    report.error(at, "invalid", "Must be the path of a file in the pack, relative to avatar.json, with forward slashes.");
    return false;
  }
  if (!isSafePath(value)) {
    report.error(at, "invalid", `"${value}" is not a safe relative path: use forward slashes, and no "..", ".", drive letters, or leading "/".`);
    return false;
  }
  if (kind === "image" && !isImagePath(value)) {
    report.error(at, "wrong-file-type", `"${value}" must be an image: ${IMAGE_EXTENSIONS.join(", ")}.`);
    return false;
  }
  if (kind === "model" && !value.toLowerCase().endsWith(".model3.json")) {
    report.error(at, "wrong-file-type", `"${value}" must be a Live2D model file ending in .model3.json.`);
    return false;
  }
  if (!files.has(value)) {
    const sameIgnoringCase = [...files].find((file) => file.toLowerCase() === value.toLowerCase());
    report.error(
      at,
      "missing-file",
      sameIgnoringCase
        ? `"${value}" is not in the pack, but "${sameIgnoringCase}" is: names are case-sensitive.`
        : `"${value}" is not in the pack.`,
    );
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// The manifest.

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ANIMATION_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const LANGUAGE_TAG = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
const TOP_KEYS = ["nlAvatar", "id", "name", "author", "license", "source", "icon", "light", "live2d"] as const;

/**
 * Checks a parsed `avatar.json` against the pack's file list (paths relative
 * to the pack root, with forward slashes). Returns the manifest, typed, when
 * it has no errors.
 */
export function checkManifest(value: unknown, files: ReadonlySet<string>): { manifest: AvatarManifest | null; issues: Issue[] } {
  const report = new Report();
  if (!isObject(value)) {
    report.error("", "invalid", "avatar.json must hold one JSON object.");
    return { manifest: null, issues: report.issues };
  }
  checkKeys(value, TOP_KEYS, "", report);

  if (value.nlAvatar === undefined) {
    report.error("nlAvatar", "missing", `"nlAvatar": ${FORMAT_VERSION} is required: it says which version of the format the pack follows.`);
  } else if (value.nlAvatar !== FORMAT_VERSION) {
    report.error("nlAvatar", "invalid", `This version of NL reads format version ${FORMAT_VERSION}, not ${JSON.stringify(value.nlAvatar)}.`);
  }

  if (value.id === undefined) {
    report.error("id", "missing", `"id" is required.`);
  } else if (typeof value.id !== "string" || value.id.length > 64 || !ID_PATTERN.test(value.id)) {
    report.error("id", "invalid", `"id" must be 1 to 64 lowercase letters, digits, and single hyphens, such as "mochi" or "mochi-2".`);
  }

  checkName(value.name, report);
  checkText(value, "author", "", 300, report);
  checkText(value, "license", "", 300, report);
  checkText(value, "source", "", 300, report);
  if (value.author === undefined || value.license === undefined) {
    report.warn(
      value.author === undefined ? "author" : "license",
      "metadata",
      `Say who made the art ("author") and under what terms it may be used ("license"); NL shows both. Write what the user knows, such as "unknown, personal use".`,
    );
  }
  if (value.icon !== undefined) checkFile(value.icon, "icon", files, report, "image");

  if (value.light === undefined && value.live2d === undefined) {
    report.error("", "missing", `A pack needs "light", "live2d", or both.`);
  }
  if (value.light !== undefined) checkLight(value.light, files, report);
  if (value.live2d !== undefined) checkLive2D(value.live2d, files, report);

  return { manifest: report.failed ? null : (value as unknown as AvatarManifest), issues: report.issues };
}

function checkName(name: unknown, report: Report) {
  if (name === undefined) {
    report.error("name", "missing", `"name" is required.`);
  } else if (typeof name === "string") {
    if (name.trim().length === 0 || name.length > 64) report.error("name", "invalid", `"name" must be 1 to 64 characters.`);
  } else if (isObject(name)) {
    const entries = Object.entries(name);
    if (entries.length === 0) report.error("name", "invalid", `"name" needs at least one language, such as { "en": "Mochi", "zh-CN": "麻糬" }.`);
    for (const [tag, text] of entries) {
      if (!LANGUAGE_TAG.test(tag)) report.error(join("name", tag), "invalid", `"${tag}" is not a language tag such as "en" or "zh-CN".`);
      if (typeof text !== "string" || text.trim().length === 0 || text.length > 64) {
        report.error(join("name", tag), "invalid", "Each name must be 1 to 64 characters.");
      }
    }
  } else {
    report.error("name", "invalid", `"name" must be text, or an object of language tags to text.`);
  }
}

// ---------------------------------------------------------------------------
// The light rendition.

const LIGHT_KEYS = ["size", "anchor", "pixelated", "animations", "states", "idleExtras", "expressions", "gestures", "pointer"] as const;
const ANIMATION_KEYS = ["frames", "sheet", "columns", "count", "image", "fps", "loop"] as const;

function checkLight(value: unknown, files: ReadonlySet<string>, report: Report) {
  const at = "light";
  if (!isObject(value)) {
    report.error(at, "invalid", `"light" must be an object.`);
    return;
  }
  checkKeys(value, LIGHT_KEYS, at, report);

  const size = value.size;
  const sizeOk = Array.isArray(size) && size.length === 2 && size.every((side) => isInteger(side, 16, 2048));
  if (size === undefined) report.error(join(at, "size"), "missing", `"size" is required: [width, height] of one frame, in pixels.`);
  else if (!sizeOk) report.error(join(at, "size"), "invalid", `"size" must be [width, height], whole pixels from 16 to 2048.`);

  if (value.anchor !== undefined) {
    const anchor = value.anchor;
    let anchorOk = Array.isArray(anchor) && anchor.length === 2 && anchor.every(isFiniteNumber);
    if (anchorOk && sizeOk) {
      const [x, y] = anchor as [number, number];
      const [width, height] = size as [number, number];
      anchorOk = x >= 0 && x <= width && y >= 0 && y <= height;
    }
    if (!anchorOk) report.error(join(at, "anchor"), "invalid", `"anchor" must be [x, y] inside a frame.`);
  }
  if (value.pixelated !== undefined && typeof value.pixelated !== "boolean") {
    report.error(join(at, "pixelated"), "invalid", `"pixelated" must be true or false.`);
  }

  const names = new Set<string>();
  const animations = value.animations;
  if (animations === undefined) {
    report.error(join(at, "animations"), "missing", `"animations" is required: named animations that the states and gestures use.`);
  } else if (!isObject(animations) || Object.keys(animations).length === 0 || Object.keys(animations).length > 200) {
    report.error(join(at, "animations"), "invalid", `"animations" must be an object of 1 to 200 named animations.`);
  } else {
    for (const [name, animation] of Object.entries(animations)) {
      const where = join(join(at, "animations"), name);
      if (!ANIMATION_NAME.test(name)) {
        report.error(where, "invalid", `Animation names use letters, digits, "_" and "-", up to 64, starting with a letter or digit.`);
      }
      names.add(name);
      checkAnimation(animation, where, files, report);
    }
  }

  const reference = (name: unknown, where: string) => {
    if (typeof name !== "string") report.error(where, "invalid", "Must be the name of an animation in \"animations\".");
    else if (isObject(animations) && !names.has(name)) report.error(where, "unknown-name", `There is no animation named "${name}".`);
  };

  if (value.states === undefined) {
    report.error(join(at, "states"), "missing", `"states" is required, with at least "idle".`);
  } else if (!isObject(value.states)) {
    report.error(join(at, "states"), "invalid", `"states" must map states to animation names.`);
  } else {
    if (value.states.idle === undefined) report.error(join(join(at, "states"), "idle"), "missing", `"idle" is required: every other state falls back to it.`);
    checkCueMap(value.states, STATES, join(at, "states"), report, reference);
  }

  if (value.idleExtras !== undefined) {
    const where = join(at, "idleExtras");
    if (!Array.isArray(value.idleExtras) || value.idleExtras.length > 20) {
      report.error(where, "invalid", `"idleExtras" must be a list of up to 20 { "animation", "every": [min, max] } entries.`);
    } else {
      value.idleExtras.forEach((extra, index) => {
        const item = join(where, index);
        if (!isObject(extra)) {
          report.error(item, "invalid", `Each entry is { "animation": name, "every": [min, max] }.`);
          return;
        }
        checkKeys(extra, ["animation", "every"], item, report);
        reference(extra.animation, join(item, "animation"));
        const every = extra.every;
        const everyOk =
          Array.isArray(every) && every.length === 2 && every.every((s) => isFiniteNumber(s) && s >= 1 && s <= 3600) && every[0] <= every[1];
        if (!everyOk) report.error(join(item, "every"), "invalid", `"every" must be [min, max] seconds, from 1 to 3600, min not above max.`);
      });
    }
  }

  for (const [key, vocabulary] of [
    ["expressions", EXPRESSIONS],
    ["gestures", GESTURES],
    ["pointer", POINTER],
  ] as const) {
    const map = value[key];
    if (map === undefined) continue;
    if (!isObject(map)) report.error(join(at, key), "invalid", `"${key}" must map names to animation names.`);
    else checkCueMap(map, vocabulary, join(at, key), report, reference);
  }
}

/** Checks a map whose keys must come from `vocabulary`; `check` checks each value. */
function checkCueMap(
  map: Record<string, unknown>,
  vocabulary: readonly string[],
  at: string,
  report: Report,
  check: (value: unknown, at: string) => void,
) {
  for (const [key, entry] of Object.entries(map)) {
    if (!vocabulary.includes(key)) {
      report.error(join(at, key), "invalid", `"${key}" is not one of: ${vocabulary.join(", ")}.`);
      continue;
    }
    check(entry, join(at, key));
  }
}

function checkAnimation(value: unknown, at: string, files: ReadonlySet<string>, report: Report) {
  if (!isObject(value)) {
    report.error(at, "invalid", `An animation is an object with "frames", "sheet", or "image".`);
    return;
  }
  checkKeys(value, ANIMATION_KEYS, at, report);
  const kinds = (["frames", "sheet", "image"] as const).filter((kind) => value[kind] !== undefined);
  if (kinds.length !== 1) {
    report.error(at, "invalid", `An animation has exactly one of "frames", "sheet", or "image"${kinds.length > 1 ? `, not ${kinds.join(" and ")}` : ""}.`);
  }
  if (value.frames !== undefined) {
    if (!Array.isArray(value.frames) || value.frames.length === 0 || value.frames.length > 600) {
      report.error(join(at, "frames"), "invalid", `"frames" must list 1 to 600 image files.`);
    } else {
      value.frames.forEach((frame, index) => checkFile(frame, join(join(at, "frames"), index), files, report, "image"));
    }
  }
  if (value.sheet !== undefined) {
    checkFile(value.sheet, join(at, "sheet"), files, report, "image");
    if (!isInteger(value.columns, 1, 256)) report.error(join(at, "columns"), "invalid", `A sheet needs "columns": how many frames a row holds, 1 to 256.`);
    if (!isInteger(value.count, 1, 4096)) report.error(join(at, "count"), "invalid", `A sheet needs "count": how many frames it holds, 1 to 4096.`);
  } else {
    for (const key of ["columns", "count"] as const) {
      if (value[key] !== undefined) report.error(join(at, key), "invalid", `"${key}" belongs only with "sheet".`);
    }
  }
  if (value.image !== undefined) {
    checkFile(value.image, join(at, "image"), files, report, "image");
    if (value.fps !== undefined) report.warn(join(at, "fps"), "invalid", `"fps" is ignored for "image": an animated image plays at its own speed.`);
  }
  if (value.fps !== undefined && !(isFiniteNumber(value.fps) && value.fps >= 1 && value.fps <= 60)) {
    report.error(join(at, "fps"), "invalid", `"fps" must be a number from 1 to 60.`);
  }
  if (value.loop !== undefined && typeof value.loop !== "boolean") {
    report.error(join(at, "loop"), "invalid", `"loop" must be true or false.`);
  }
}

// ---------------------------------------------------------------------------
// The Live2D rendition.

const LIVE2D_KEYS = ["model", "framing", "parameters", "base", "states", "expressions", "gestures", "pointer"] as const;
const POSE_KEYS = ["expression", "motion", "params"] as const;

function checkLive2D(value: unknown, files: ReadonlySet<string>, report: Report) {
  const at = "live2d";
  if (!isObject(value)) {
    report.error(at, "invalid", `"live2d" must be an object.`);
    return;
  }
  checkKeys(value, LIVE2D_KEYS, at, report);
  if (value.model === undefined) report.error(join(at, "model"), "missing", `"model" is required: the model's .model3.json file.`);
  else checkFile(value.model, join(at, "model"), files, report, "model");

  if (value.framing !== undefined) {
    const where = join(at, "framing");
    if (!isObject(value.framing)) {
      report.error(where, "invalid", `"framing" must be { "zoom", "x", "y" }.`);
    } else {
      checkKeys(value.framing, ["zoom", "x", "y"], where, report);
      const { zoom, x, y } = value.framing;
      if (zoom !== undefined && !(isFiniteNumber(zoom) && zoom >= 0.1 && zoom <= 10)) report.error(join(where, "zoom"), "invalid", `"zoom" must be from 0.1 to 10.`);
      for (const [key, offset] of [["x", x], ["y", y]] as const) {
        if (offset !== undefined && !(isFiniteNumber(offset) && offset >= -1 && offset <= 1)) {
          report.error(join(where, key), "invalid", `"${key}" must be from -1 to 1, a fraction of the window.`);
        }
      }
    }
  }

  if (value.parameters !== undefined) {
    const where = join(at, "parameters");
    if (!isObject(value.parameters)) {
      report.error(where, "invalid", `"parameters" must map standard controls to the model's parameter ids.`);
    } else {
      for (const [control, id] of Object.entries(value.parameters)) {
        if (!(control in LIVE2D_CONTROLS)) {
          report.error(join(where, control), "invalid", `"${control}" is not one of: ${Object.keys(LIVE2D_CONTROLS).join(", ")}.`);
        } else if (typeof id !== "string" || id.length === 0 || id.length > 128) {
          report.error(join(where, control), "invalid", "Must be a parameter id of the model.");
        }
      }
    }
  }

  if (value.base !== undefined) checkPose(value.base, join(at, "base"), report);
  for (const [key, vocabulary] of [
    ["states", STATES],
    ["expressions", EXPRESSIONS],
    ["pointer", POINTER],
  ] as const) {
    const map = value[key];
    if (map === undefined) continue;
    if (!isObject(map)) report.error(join(at, key), "invalid", `"${key}" must map names to poses.`);
    else checkCueMap(map, vocabulary, join(at, key), report, (pose, where) => checkPose(pose, where, report));
  }
  if (value.gestures !== undefined) {
    if (!isObject(value.gestures)) {
      report.error(join(at, "gestures"), "invalid", `"gestures" must map gestures to { "motion": group }.`);
    } else {
      checkCueMap(value.gestures, GESTURES, join(at, "gestures"), report, (gesture, where) => {
        if (!isObject(gesture) || typeof gesture.motion !== "string" || gesture.motion.length === 0) {
          report.error(where, "invalid", `A gesture is { "motion": "<motion group of the model>" }.`);
        } else {
          checkKeys(gesture, ["motion"], where, report);
        }
      });
    }
  }
}

function checkPose(value: unknown, at: string, report: Report) {
  if (!isObject(value)) {
    report.error(at, "invalid", `A pose is an object with "expression", "motion", "params", or several.`);
    return;
  }
  checkKeys(value, POSE_KEYS, at, report);
  if (!POSE_KEYS.some((key) => value[key] !== undefined)) {
    report.error(at, "invalid", `A pose needs "expression", "motion", or "params".`);
  }
  for (const key of ["expression", "motion"] as const) {
    if (value[key] !== undefined && (typeof value[key] !== "string" || (value[key] as string).length === 0)) {
      report.error(join(at, key), "invalid", `"${key}" must be a name from the model.`);
    }
  }
  if (value.params !== undefined) {
    if (!isObject(value.params)) {
      report.error(join(at, "params"), "invalid", `"params" must map parameter ids to numbers.`);
    } else {
      for (const [id, offset] of Object.entries(value.params)) {
        if (!(isFiniteNumber(offset) && Math.abs(offset) <= 1000)) {
          report.error(join(join(at, "params"), id), "invalid", "Each offset must be a number from -1000 to 1000.");
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// A Live2D model's own files and names.

/** What a `.model3.json` offers, for checking the names a manifest uses. */
export interface Live2DModelFacts {
  /** Every pack file the model refers to. */
  files: string[];
  /** The moc3 file. */
  moc: string;
  /** The `DisplayInfo` (`.cdi3.json`) file, whose parameter list tells which ids exist; null when absent. */
  displayInfo: string | null;
  expressions: string[];
  motionGroups: string[];
}

/**
 * Checks a parsed `.model3.json`, found at `modelPath` in the pack: every
 * file it names must be in the pack, and its names must not repeat.
 */
export function checkModel3(value: unknown, modelPath: string, files: ReadonlySet<string>): { facts: Live2DModelFacts | null; issues: Issue[] } {
  const report = new Report();
  const at = modelPath;
  if (!isObject(value) || !isObject(value.FileReferences)) {
    report.error(at, "invalid", "Not a Live2D model: a .model3.json holds an object with \"FileReferences\". Cubism 2 models (.moc, model.json) must be exported again as Cubism 3 or later.");
    return { facts: null, issues: report.issues };
  }
  const base = folderOf(modelPath);
  const references = value.FileReferences;
  const facts: Live2DModelFacts = { files: [], moc: "", displayInfo: null, expressions: [], motionGroups: [] };

  const refer = (reference: unknown, where: string, extension: string | null): string | null => {
    if (typeof reference !== "string") {
      report.error(where, "invalid", "Must be a file path.");
      return null;
    }
    const path = joinPackPath(base, reference);
    if (path === null) {
      report.error(where, "invalid", `"${reference}" leaves the pack or is malformed.`);
      return null;
    }
    if (!files.has(path)) {
      report.error(where, "missing-file", `"${reference}" (${path}) is not in the pack.`);
      return null;
    }
    if (extension !== null && !path.toLowerCase().endsWith(extension)) {
      report.error(where, "wrong-file-type", `"${reference}" should end in ${extension}.`);
    }
    facts.files.push(path);
    return path;
  };

  facts.moc = refer(references.Moc, `${at} FileReferences.Moc`, ".moc3") ?? "";
  if (!Array.isArray(references.Textures) || references.Textures.length === 0) {
    report.error(`${at} FileReferences.Textures`, "missing", "A model needs at least one texture.");
  } else {
    references.Textures.forEach((texture, index) => refer(texture, `${at} FileReferences.Textures[${index}]`, ".png"));
  }
  for (const key of ["Physics", "Pose", "UserData"] as const) {
    if (references[key] !== undefined) refer(references[key], `${at} FileReferences.${key}`, ".json");
  }
  if (references.DisplayInfo !== undefined) {
    facts.displayInfo = refer(references.DisplayInfo, `${at} FileReferences.DisplayInfo`, ".cdi3.json");
  }
  if (references.Expressions !== undefined) {
    if (!Array.isArray(references.Expressions)) {
      report.error(`${at} FileReferences.Expressions`, "invalid", "Must be a list.");
    } else {
      references.Expressions.forEach((expression, index) => {
        const where = `${at} FileReferences.Expressions[${index}]`;
        if (!isObject(expression) || typeof expression.Name !== "string") {
          report.error(where, "invalid", "Each expression has a \"Name\" and a \"File\".");
          return;
        }
        if (facts.expressions.includes(expression.Name)) report.warn(where, "invalid", `The name "${expression.Name}" repeats; only the first is used.`);
        facts.expressions.push(expression.Name);
        refer(expression.File, `${where}.File`, ".exp3.json");
      });
    }
  }
  if (references.Motions !== undefined) {
    if (!isObject(references.Motions)) {
      report.error(`${at} FileReferences.Motions`, "invalid", "Must map motion groups to lists of motions.");
    } else {
      for (const [group, motions] of Object.entries(references.Motions)) {
        const where = `${at} FileReferences.Motions.${group}`;
        facts.motionGroups.push(group);
        if (!Array.isArray(motions)) {
          report.error(where, "invalid", "Each group is a list of motions.");
          continue;
        }
        motions.forEach((motion, index) => {
          if (!isObject(motion)) {
            report.error(`${where}[${index}]`, "invalid", "Each motion has a \"File\".");
            return;
          }
          refer(motion.File, `${where}[${index}].File`, ".motion3.json");
          if (motion.Sound !== undefined) refer(motion.Sound, `${where}[${index}].Sound`, null);
        });
      }
    }
  }
  return { facts: report.failed ? null : facts, issues: report.issues };
}

/**
 * The parameter ids a `.cdi3.json` lists, or null when it is not one. Used
 * to check that the ids a manifest names exist in the model.
 */
export function displayInfoParameters(value: unknown): string[] | null {
  if (!isObject(value) || !Array.isArray(value.Parameters)) return null;
  return value.Parameters.flatMap((parameter) => (isObject(parameter) && typeof parameter.Id === "string" ? [parameter.Id] : []));
}

/**
 * Checks the names a valid Live2D rendition uses against its model: each
 * expression and motion group must exist, and each parameter id too when
 * `parameters` is known (from the model's `.cdi3.json`).
 */
export function checkLive2DNames(live2d: Live2DRendition, facts: Live2DModelFacts, parameters: readonly string[] | null): Issue[] {
  const report = new Report();
  const checkPoseNames = (pose: Live2DPose | undefined, at: string) => {
    if (!pose) return;
    if (pose.expression !== undefined && !facts.expressions.includes(pose.expression)) {
      report.error(join(at, "expression"), "unknown-name", `The model has no expression named "${pose.expression}". It has: ${facts.expressions.join(", ") || "none"}.`);
    }
    if (pose.motion !== undefined && !facts.motionGroups.includes(pose.motion)) {
      report.error(join(at, "motion"), "unknown-name", `The model has no motion group "${pose.motion}". It has: ${facts.motionGroups.join(", ") || "none"}.`);
    }
    for (const id of Object.keys(pose.params ?? {})) {
      if (parameters !== null && !parameters.includes(id)) {
        report.error(join(join(at, "params"), id), "unknown-name", `The model has no parameter "${id}".`);
      }
    }
  };
  checkPoseNames(live2d.base, "live2d.base");
  for (const key of ["states", "expressions", "pointer"] as const) {
    for (const [name, pose] of Object.entries(live2d[key] ?? {})) checkPoseNames(pose as Live2DPose, `live2d.${key}.${name}`);
  }
  for (const [name, gesture] of Object.entries(live2d.gestures ?? {})) {
    checkPoseNames({ motion: (gesture as { motion: string }).motion }, `live2d.gestures.${name}`);
  }
  if (parameters !== null) {
    for (const [control, id] of Object.entries(live2d.parameters ?? {})) {
      if (!parameters.includes(id as string)) report.error(`live2d.parameters.${control}`, "unknown-name", `The model has no parameter "${id}".`);
    }
  }
  return report.issues;
}

/** The text to show for a localized name in the given language, falling back to English, then to any. */
export function localizedText(text: LocalizedText, language: string): string {
  if (typeof text === "string") return text;
  const primary = language.split("-")[0];
  return (
    text[language] ??
    Object.entries(text).find(([tag]) => tag.split("-")[0] === primary)?.[1] ??
    text.en ??
    Object.values(text)[0] ??
    ""
  );
}
