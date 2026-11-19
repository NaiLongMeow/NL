/**
 * What the skill's command line does with folders on disk: list a pack's
 * files under the format's file rules, check a whole pack (manifest, images,
 * Live2D model), inventory a folder of the user's art before a manifest
 * exists, and install a checked pack into NL's avatars folder.
 *
 * Only Node's built-in modules are used, so that the skill works wherever an
 * agent can run Node 22.18 or later, without installing anything.
 */

import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, copyFileSync } from "node:fs";
import { posix, win32 } from "node:path";
import {
  LIMITS,
  MANIFEST,
  checkLive2DNames,
  checkManifest,
  checkModel3,
  displayInfoParameters,
  isAllowedFile,
  joinPackPath,
  folderOf,
  type AvatarManifest,
  type Issue,
  type LightRendition,
} from "./format.ts";
import { readImageInfo, type ImageInfo } from "./images.ts";

/** The desktop app's identifier (apps/desktop/src-tauri/tauri.conf.json), which names its data folder. */
export const APP_IDENTIFIER = "dev.nailongmeow.nl";

/**
 * NL's avatars folder on this computer: `avatars` in the app's local data
 * folder, where the desktop app looks for installed packs.
 */
export function defaultAvatarsFolder(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
  home: string = process.env.HOME ?? process.env.USERPROFILE ?? "",
): string {
  if (platform === "win32") {
    return win32.join(env.LOCALAPPDATA || win32.join(home, "AppData", "Local"), APP_IDENTIFIER, "avatars");
  }
  if (platform === "darwin") {
    return posix.join(home, "Library", "Application Support", APP_IDENTIFIER, "avatars");
  }
  return posix.join(env.XDG_DATA_HOME || posix.join(home, ".local", "share"), APP_IDENTIFIER, "avatars");
}

export interface PackFile {
  /** Relative to the pack root, with forward slashes. */
  path: string;
  size: number;
}

export interface Listing {
  /** Files the pack may contain. */
  files: PackFile[];
  /** Files that are left out, and why: not a data file the format allows, or a symbolic link. */
  skipped: { path: string; reason: "not-allowed" | "symlink" }[];
}

/** Lists a folder's files under the format's file rules, without following symbolic links. */
export function listFolder(folder: string): Listing {
  const listing: Listing = { files: [], skipped: [] };
  const walk = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      const full = `${dir}/${entry.name}`;
      if (entry.isSymbolicLink()) listing.skipped.push({ path, reason: "symlink" });
      else if (entry.isDirectory()) walk(full, path);
      else if (entry.isFile() && isAllowedFile(path)) listing.files.push({ path, size: lstatSync(full).size });
      else listing.skipped.push({ path, reason: "not-allowed" });
    }
  };
  walk(folder, "");
  listing.files.sort((a, b) => (a.path < b.path ? -1 : 1));
  return listing;
}

export interface CheckResult {
  /** The manifest, when the pack has no errors. */
  manifest: AvatarManifest | null;
  issues: Issue[];
  files: PackFile[];
}

/** Checks the pack in `folder` completely: its files, its manifest, its images, and its Live2D model. */
export function checkFolder(folder: string): CheckResult {
  const listing = listFolder(folder);
  const issues: Issue[] = [];
  for (const { path, reason } of listing.skipped) {
    issues.push({
      level: "warning",
      at: path,
      code: "file-not-allowed",
      message:
        reason === "symlink"
          ? "A symbolic link; it is left out. Copy the file itself into the pack."
          : "Not a data file the format allows; it is left out. Packs hold json, moc3, png, jpg, jpeg, webp, gif, wav, mp3, txt, and md files only.",
    });
  }
  for (const [path, other] of caseClashes(listing.files.map((file) => file.path))) {
    issues.push({ level: "error", at: path, code: "case-clash", message: `"${path}" and "${other}" differ only in letter case, which clashes on Windows and macOS. Rename one.` });
  }
  const total = listing.files.reduce((sum, file) => sum + file.size, 0);
  if (listing.files.length > LIMITS.files || total > LIMITS.totalBytes) {
    issues.push({
      level: "error",
      at: "",
      code: "too-large",
      message: `The pack has ${listing.files.length} files and ${total} bytes; the limits are ${LIMITS.files} files and ${LIMITS.totalBytes} bytes. Leave out unused files and shrink large textures.`,
    });
  }

  const files = new Set(listing.files.map((file) => file.path));
  const read = (path: string) => readFileSync(`${folder}/${path}`);
  const manifestFile = listing.files.find((file) => file.path === MANIFEST);
  if (!manifestFile) {
    issues.push({ level: "error", at: MANIFEST, code: "missing-file", message: `The pack has no ${MANIFEST} at its root.` });
    return { manifest: null, issues, files: listing.files };
  }
  if (manifestFile.size > LIMITS.manifestBytes) {
    issues.push({ level: "error", at: MANIFEST, code: "too-large", message: `${MANIFEST} is larger than ${LIMITS.manifestBytes} bytes.` });
    return { manifest: null, issues, files: listing.files };
  }
  const parsed = parseJson(read(MANIFEST));
  if (parsed === undefined) {
    issues.push({ level: "error", at: MANIFEST, code: "invalid", message: `${MANIFEST} is not valid JSON (UTF-8, no comments, no trailing commas).` });
    return { manifest: null, issues, files: listing.files };
  }
  const checked = checkManifest(parsed, files);
  issues.push(...checked.issues);
  const manifest = checked.manifest;
  if (manifest?.light) issues.push(...checkLightImages(manifest.light, manifest.icon, read));
  if (manifest?.live2d) issues.push(...checkLive2DModel(manifest, files, read));
  const failed = issues.some((issue) => issue.level === "error");
  return { manifest: failed ? null : manifest, issues, files: listing.files };
}

/**
 * Pairs of paths that differ only in letter case: each later path with the
 * first one it clashes with. Such a pair can exist on Linux, but on Windows
 * and macOS one file would overwrite the other.
 */
export function caseClashes(paths: readonly string[]): [string, string][] {
  const seen = new Map<string, string>();
  const clashes: [string, string][] = [];
  for (const path of paths) {
    const folded = path.toLowerCase();
    const other = seen.get(folded);
    if (other === undefined) seen.set(folded, path);
    else clashes.push([path, other]);
  }
  return clashes;
}

/** JSON from UTF-8 bytes, a leading byte-order mark allowed; undefined when it does not parse. */
function parseJson(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^﻿/, ""));
  } catch {
    return undefined;
  }
}

/** Checks that the light rendition's images are images, that sheets hold their frames, and that frames have the declared size. */
function checkLightImages(light: LightRendition, icon: string | undefined, read: (path: string) => Uint8Array): Issue[] {
  const issues: Issue[] = [];
  const [width, height] = light.size;
  const cache = new Map<string, ImageInfo | null>();
  const info = (path: string, at: string): ImageInfo | null => {
    if (!cache.has(path)) cache.set(path, readImageInfo(read(path)));
    const result = cache.get(path) ?? null;
    if (result === null) issues.push({ level: "error", at, code: "unreadable", message: `"${path}" is not a PNG, GIF, WebP, or JPEG image, or it is damaged.` });
    return result;
  };
  const sizeWarning = (image: ImageInfo, path: string, at: string) => {
    if (image.width !== width || image.height !== height) {
      issues.push({
        level: "warning",
        at,
        code: "invalid",
        message: `"${path}" is ${image.width}x${image.height}, not the ${width}x${height} of "size"; it is scaled to fit, which can blur it or change its proportions.`,
      });
    }
  };
  for (const [name, animation] of Object.entries(light.animations)) {
    const at = `light.animations.${name}`;
    animation.frames?.forEach((frame, index) => {
      const image = info(frame, `${at}.frames[${index}]`);
      if (image) sizeWarning(image, frame, `${at}.frames[${index}]`);
    });
    if (animation.sheet !== undefined) {
      const image = info(animation.sheet, `${at}.sheet`);
      const columns = animation.columns ?? 1;
      const rows = Math.ceil((animation.count ?? 1) / columns);
      if (image && (image.width < columns * width || image.height < rows * height)) {
        issues.push({
          level: "error",
          at: `${at}.sheet`,
          code: "invalid",
          message: `"${animation.sheet}" is ${image.width}x${image.height}, too small for ${animation.count} frames of ${width}x${height} in ${columns} columns (needs ${columns * width}x${rows * height}).`,
        });
      }
    }
    if (animation.image !== undefined) {
      const image = info(animation.image, `${at}.image`);
      if (image) sizeWarning(image, animation.image, `${at}.image`);
    }
  }
  if (icon !== undefined) info(icon, "icon");
  return issues;
}

/** Checks the Live2D model the manifest names: its own references, its moc3 header, and the names the manifest uses. */
function checkLive2DModel(manifest: AvatarManifest, files: ReadonlySet<string>, read: (path: string) => Uint8Array): Issue[] {
  const live2d = manifest.live2d!;
  const model3 = parseJson(read(live2d.model));
  if (model3 === undefined) {
    return [{ level: "error", at: live2d.model, code: "invalid", message: `"${live2d.model}" is not valid JSON.` }];
  }
  const { facts, issues } = checkModel3(model3, live2d.model, files);
  if (!facts) return issues;
  const moc = read(facts.moc);
  if (moc.length < 5 || String.fromCharCode(...moc.subarray(0, 4)) !== "MOC3") {
    issues.push({ level: "error", at: facts.moc, code: "unreadable", message: `"${facts.moc}" is not a moc3 file (it does not start with "MOC3").` });
  }
  const parameters = facts.displayInfo === null ? null : displayInfoParameters(parseJson(read(facts.displayInfo)));
  if (parameters === null && hasParams(live2d)) {
    issues.push({
      level: "warning",
      at: "live2d",
      code: "unknown-name",
      message: "The model has no readable .cdi3.json, so the parameter ids in the manifest cannot be checked. Check them in the model's files.",
    });
  }
  issues.push(...checkLive2DNames(live2d, facts, parameters));
  return issues;
}

function hasParams(live2d: NonNullable<AvatarManifest["live2d"]>): boolean {
  const poses = [live2d.base, ...Object.values(live2d.states ?? {}), ...Object.values(live2d.expressions ?? {}), ...Object.values(live2d.pointer ?? {})];
  return Object.keys(live2d.parameters ?? {}).length > 0 || poses.some((pose) => pose?.params && Object.keys(pose.params).length > 0);
}

// ---------------------------------------------------------------------------
// Inventory: what a folder of art holds, before there is a manifest.

export interface Live2DModelInventory {
  model: string;
  moc: string | null;
  /** The moc3 file's format version (byte 4 of the file); newer Cubism Editors write higher versions. */
  mocVersion: number | null;
  textures: string[];
  expressions: { name: string; file: string }[];
  motionGroups: Record<string, number>;
  /** From the `.cdi3.json`: every parameter's id, display name, and group. */
  parameters: { id: string; name: string; group: string }[];
  hitAreas: string[];
  /** Parameter ids the model itself lists for blinking and lip sync. */
  eyeBlink: string[];
  lipSync: string[];
  physics: boolean;
  pose: boolean;
  problems: Issue[];
}

export interface Inventory {
  folder: string;
  files: number;
  totalBytes: number;
  skipped: Listing["skipped"];
  /** Whether the folder already has an avatar.json. */
  hasManifest: boolean;
  images: ({ path: string } & ImageInfo)[];
  /** Images that could not be read. */
  unreadableImages: string[];
  live2d: Live2DModelInventory[];
  /** Other JSON files at the root, which may be another app's manifest worth converting (such as a character.json). */
  otherJson: string[];
}

/** Lists what a folder holds, for an agent writing its avatar.json. */
export function inspectFolder(folder: string): Inventory {
  const listing = listFolder(folder);
  const files = new Set(listing.files.map((file) => file.path));
  const read = (path: string) => readFileSync(`${folder}/${path}`);
  const inventory: Inventory = {
    folder,
    files: listing.files.length,
    totalBytes: listing.files.reduce((sum, file) => sum + file.size, 0),
    skipped: listing.skipped,
    hasManifest: files.has(MANIFEST),
    images: [],
    unreadableImages: [],
    live2d: [],
    otherJson: listing.files
      .map((file) => file.path)
      .filter((path) => !path.includes("/") && path.toLowerCase().endsWith(".json") && path !== MANIFEST && !path.toLowerCase().includes("3.json")),
  };
  for (const { path } of listing.files) {
    const lower = path.toLowerCase();
    if (/\.(png|gif|webp|jpe?g)$/.test(lower)) {
      const info = readImageInfo(read(path));
      if (info) inventory.images.push({ path, ...info });
      else inventory.unreadableImages.push(path);
    }
    if (lower.endsWith(".model3.json")) inventory.live2d.push(inspectModel(path, files, read));
  }
  return inventory;
}

function inspectModel(model: string, files: ReadonlySet<string>, read: (path: string) => Uint8Array): Live2DModelInventory {
  const result: Live2DModelInventory = {
    model,
    moc: null,
    mocVersion: null,
    textures: [],
    expressions: [],
    motionGroups: {},
    parameters: [],
    hitAreas: [],
    eyeBlink: [],
    lipSync: [],
    physics: false,
    pose: false,
    problems: [],
  };
  const json = parseJson(read(model)) as Record<string, any> | undefined;
  const { facts, issues } = checkModel3(json, model, files);
  result.problems = issues;
  const references = json?.FileReferences ?? {};
  const base = folderOf(model);
  const resolve = (reference: unknown) => (typeof reference === "string" ? joinPackPath(base, reference) : null);
  result.textures = Array.isArray(references.Textures) ? references.Textures.flatMap((t: unknown) => resolve(t) ?? []) : [];
  result.physics = typeof references.Physics === "string";
  result.pose = typeof references.Pose === "string";
  if (Array.isArray(references.Expressions)) {
    result.expressions = references.Expressions.flatMap((e: any) => (typeof e?.Name === "string" ? [{ name: e.Name, file: resolve(e.File) ?? String(e.File) }] : []));
  }
  if (references.Motions && typeof references.Motions === "object") {
    for (const [group, list] of Object.entries(references.Motions)) result.motionGroups[group] = Array.isArray(list) ? list.length : 0;
  }
  if (Array.isArray(json?.HitAreas)) result.hitAreas = json.HitAreas.flatMap((h: any) => (typeof h?.Name === "string" ? [h.Name] : typeof h?.Id === "string" ? [h.Id] : []));
  if (Array.isArray(json?.Groups)) {
    for (const group of json.Groups) {
      if (group?.Name === "EyeBlink" && Array.isArray(group.Ids)) result.eyeBlink = group.Ids;
      if (group?.Name === "LipSync" && Array.isArray(group.Ids)) result.lipSync = group.Ids;
    }
  }
  const mocPath = facts?.moc ?? resolve(references.Moc);
  if (mocPath && files.has(mocPath)) {
    result.moc = mocPath;
    const moc = read(mocPath);
    if (moc.length >= 5 && String.fromCharCode(...moc.subarray(0, 4)) === "MOC3") result.mocVersion = moc[4]!;
  }
  const displayInfo = resolve(references.DisplayInfo);
  if (displayInfo && files.has(displayInfo)) {
    const cdi = parseJson(read(displayInfo)) as Record<string, any> | undefined;
    if (Array.isArray(cdi?.Parameters)) {
      result.parameters = cdi.Parameters.flatMap((p: any) =>
        typeof p?.Id === "string" ? [{ id: p.Id, name: typeof p.Name === "string" ? p.Name : "", group: typeof p.GroupId === "string" ? p.GroupId : "" }] : [],
      );
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Install.

/**
 * Checks the pack in `folder` and copies its allowed files into
 * `avatarsFolder/<id>`. The copy is made beside the target under a hidden
 * name and renamed into place, so NL never sees half a pack. An installed
 * pack with the same id is replaced only when `replace` is set.
 */
export function installFolder(folder: string, avatarsFolder: string, { replace = false } = {}): { id: string; path: string; result: CheckResult } {
  const result = checkFolder(folder);
  if (!result.manifest) throw new InstallError("The pack has errors; run the check and fix them first.", result);
  const id = result.manifest.id;
  const target = `${avatarsFolder}/${id}`;
  if (existsSync(target) && !replace) {
    throw new InstallError(`An avatar with the id "${id}" is already installed at ${target}. Install again with --replace to overwrite it.`, result);
  }
  mkdirSync(avatarsFolder, { recursive: true });
  const staging = `${avatarsFolder}/.${id}.installing-${process.pid}`;
  rmSync(staging, { recursive: true, force: true });
  for (const { path } of result.files) {
    const destination = `${staging}/${path}`;
    mkdirSync(destination.slice(0, destination.lastIndexOf("/")), { recursive: true });
    copyFileSync(`${folder}/${path}`, destination);
  }
  if (existsSync(target)) {
    const old = `${avatarsFolder}/.${id}.replaced-${process.pid}`;
    renameSync(target, old);
    renameSync(staging, target);
    rmSync(old, { recursive: true, force: true });
  } else {
    renameSync(staging, target);
  }
  return { id, path: target, result };
}

export class InstallError extends Error {
  /** The check, with the issues that stopped the install. */
  readonly result: CheckResult;
  // No parameter properties: Node only strips types, and those are not just types.
  constructor(message: string, result: CheckResult) {
    super(message);
    this.result = result;
  }
}
