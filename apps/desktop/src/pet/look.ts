/**
 * What the pet shows (UI design note, section 6): the user's choice of mode
 * and avatar, kept on this device, and how that choice becomes a look.
 *
 * *(user, 2026-11-19)* The pet has two modes the user picks: light, which
 * shows the built-in ball or an avatar of the user's own, and Live2D, which
 * shows an avatar's Live2D rendition (heavier). In light mode an avatar
 * shows its code rendition (a page of the pack's own, run sandboxed, which
 * the user called the freest way to import a character: it can do what the
 * others do and more), else its light rendition (images, cheap); what code
 * costs depends on the code. When the choice cannot show, because the
 * avatar is gone or broken, this build cannot run Live2D, or a rendition
 * failed to load, the pet falls back: to the same avatar's light-mode look
 * if it has one, else to the ball. It never shows nothing.
 */

import type { CodeRendition, LightRendition, Live2DRendition } from "@nl/avatar-skill/format";
import type { CheckedAvatar, Live2DStatus } from "../avatars/avatars";

export type PetMode = "light" | "live2d";

/**
 * The pet settings: whether the pet is shown, its mode, and the avatar
 * chosen for each mode (null: the ball, in light mode).
 */
export interface PetPrefs {
  shown: boolean;
  mode: PetMode;
  light: string | null;
  live2d: string | null;
}

/** Where the pet settings are kept. */
export const PET_KEY = "nl.pet";

export const DEFAULT_PET: PetPrefs = { shown: true, mode: "light", light: null, live2d: null };

/** The pet settings from their stored form; anything unknown takes the default. */
export function parsePetPrefs(raw: string | null | undefined): PetPrefs {
  try {
    const value = JSON.parse(raw ?? "null") as Partial<Record<keyof PetPrefs, unknown>> | null;
    const text = (field: unknown) => (typeof field === "string" && field.length > 0 ? field : null);
    return {
      shown: value?.shown !== false,
      mode: value?.mode === "live2d" ? "live2d" : "light",
      light: text(value?.light),
      live2d: text(value?.live2d),
    };
  } catch {
    return DEFAULT_PET;
  }
}

export function loadPetPrefs(storage: Pick<Storage, "getItem"> | undefined = globalThis.localStorage): PetPrefs {
  return parsePetPrefs(storage?.getItem(PET_KEY));
}

export function savePetPrefs(prefs: PetPrefs, storage: Pick<Storage, "setItem"> | undefined = globalThis.localStorage) {
  storage?.setItem(PET_KEY, JSON.stringify(prefs));
}

/** Whether this build can run Live2D at all. */
export function canShowLive2D(status: Live2DStatus): boolean {
  return status === "ready" || status === "development";
}

export type Look =
  | { kind: "ball" }
  | { kind: "light"; key: string; rendition: LightRendition }
  | { kind: "live2d"; key: string; rendition: Live2DRendition }
  | { kind: "code"; key: string; rendition: CodeRendition };

/** What names a look of an avatar pack among the others: its kind and the pack's key. */
export function lookId(look: Exclude<Look, { kind: "ball" }>): string {
  return `${look.kind}:${look.key}`;
}

/**
 * What the pet shows for these settings, given the installed avatars.
 * `failed` holds the looks (`lookId`) that failed to load in this window,
 * which are passed over.
 */
export function chooseLook(prefs: PetPrefs, avatars: readonly CheckedAvatar[], live2d: Live2DStatus, failed: ReadonlySet<string> = new Set()): Look {
  const key = prefs.mode === "live2d" ? prefs.live2d : prefs.light;
  const chosen = key === null ? undefined : avatars.find((avatar) => avatar.key === key);
  const manifest = chosen?.manifest;
  if (!chosen || !manifest) return { kind: "ball" };
  const looks: Exclude<Look, { kind: "ball" }>[] = [];
  if (prefs.mode === "live2d" && manifest.live2d && canShowLive2D(live2d)) looks.push({ kind: "live2d", key: chosen.key, rendition: manifest.live2d });
  if (manifest.code) looks.push({ kind: "code", key: chosen.key, rendition: manifest.code });
  if (manifest.light) looks.push({ kind: "light", key: chosen.key, rendition: manifest.light });
  return looks.find((look) => !failed.has(lookId(look))) ?? { kind: "ball" };
}
