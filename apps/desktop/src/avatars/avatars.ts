/**
 * The avatars the user installed (UI design note, sections 6 and 10): as the
 * desktop app's native side lists them (src-tauri/src/avatars.rs), checked
 * with the avatar format's own rules (@nl/avatar-skill/format, the same code
 * the nl-avatar skill's checker runs), and the URLs their files load from.
 *
 * Outside the desktop app (the development server in a browser, the tests)
 * there are no avatars, and only the built-in ball shows.
 */

import { convertFileSrc, invoke, isTauri } from "@tauri-apps/api/core";
import { checkManifest, type AvatarManifest, type Issue } from "@nl/avatar-skill/format";

/** Whether this build can show Live2D avatars, and why not (avatars.rs, `Live2D`). */
export type Live2DStatus = "ready" | "development" | "no-runtime" | "runtime-refused";

/** Why a pack folder cannot be used before its manifest is read (avatars.rs, `Problem`). */
export type PackProblem = "no-manifest" | "manifest-too-large" | "not-utf8" | "too-large" | "too-many-files" | "unreadable";

/** One pack folder, as avatars.rs lists it. */
export interface AvatarEntry {
  /** The name `nlavatar` URLs use: the folder name, or a development pack's id. */
  key: string;
  /** The text of avatar.json; null with a problem. */
  manifest: string | null;
  /** The files the pack may use. */
  files: string[];
  /** Files left out. */
  skipped: string[];
  problem: PackProblem | null;
  /** Whether it comes from NL_DEV_AVATARS rather than the avatars folder. */
  development: boolean;
}

export interface AvatarList {
  folder: string;
  avatars: AvatarEntry[];
  live2d: Live2DStatus;
}

/** Why an installed avatar cannot be shown. */
export type AvatarProblem =
  | { kind: "pack"; problem: PackProblem }
  /** The manifest's first error. */
  | { kind: "manifest"; issue: Issue }
  /** The folder is not named after the manifest's id. */
  | { kind: "folder"; id: string };

export interface CheckedAvatar {
  key: string;
  development: boolean;
  /** The manifest when the avatar can be shown, else null. */
  manifest: AvatarManifest | null;
  problem: AvatarProblem | null;
}

/** Checks a listed pack with the format's rules. */
export function checkAvatar(entry: AvatarEntry): CheckedAvatar {
  const base = { key: entry.key, development: entry.development, manifest: null };
  if (entry.problem !== null || entry.manifest === null) {
    return { ...base, problem: { kind: "pack", problem: entry.problem ?? "no-manifest" } };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(entry.manifest.replace(/^﻿/, ""));
  } catch {
    return {
      ...base,
      problem: { kind: "manifest", issue: { level: "error", at: "avatar.json", code: "invalid", message: "avatar.json is not valid JSON." } },
    };
  }
  const { manifest, issues } = checkManifest(parsed, new Set(entry.files));
  if (!manifest) {
    return { ...base, problem: { kind: "manifest", issue: issues.find((issue) => issue.level === "error")! } };
  }
  // Installed packs are found by folder name, so it must be the id (the skill's installer makes it so).
  if (!entry.development && manifest.id !== entry.key) return { ...base, problem: { kind: "folder", id: manifest.id } };
  return { ...base, manifest, problem: null };
}

/** The installed avatars, their folder, and whether Live2D can show; null outside the desktop app. */
export async function loadAvatars(): Promise<AvatarList | null> {
  return isTauri() ? invoke<AvatarList>("avatars") : null;
}

export async function openAvatarsFolder(): Promise<void> {
  if (isTauri()) await invoke("open_avatars_folder");
}

/**
 * The start of every `nlavatar` URL: `http://nlavatar.localhost/` on Windows,
 * `nlavatar://localhost/` elsewhere. Tauri knows which; outside the desktop
 * app (the tests) the same rule is applied here.
 */
function base(): string {
  if (isTauri()) return convertFileSrc("", "nlavatar");
  return /Windows|Android/.test(globalThis.navigator?.userAgent ?? "") ? "http://nlavatar.localhost/" : "nlavatar://localhost/";
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

/** The URL of a file of the avatar known by `key`. */
export function avatarFileUrl(key: string, path: string): string {
  return `${base()}a/${encodeURIComponent(key)}/${encodePath(path)}`;
}

/** The URL of a file of the Live2D runtime. */
export function runtimeFileUrl(path: string): string {
  return `${base()}runtime/${encodePath(path)}`;
}
