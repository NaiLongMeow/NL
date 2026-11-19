/**
 * What the pet shows (UI design note, section 6): the user's choice of mode
 * and avatar, kept on this device, and how that choice becomes a look.
 *
 * *(user, 2026-11-19)* The pet has two modes the user picks: light, which
 * shows the built-in ball or an avatar's light rendition (images, cheap),
 * and Live2D, which shows an avatar's Live2D rendition (heavier). When the
 * choice cannot show, because the avatar is gone or broken or this build
 * cannot run Live2D, the pet falls back: to the same avatar's light
 * rendition if it has one, else to the ball. It never shows nothing.
 */

import type { LightRendition, Live2DRendition } from "@nl/avatar-skill/format";
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
  | { kind: "live2d"; key: string; rendition: Live2DRendition };

/** What the pet shows for these settings, given the installed avatars. */
export function chooseLook(prefs: PetPrefs, avatars: readonly CheckedAvatar[], live2d: Live2DStatus): Look {
  const key = prefs.mode === "live2d" ? prefs.live2d : prefs.light;
  const chosen = key === null ? undefined : avatars.find((avatar) => avatar.key === key);
  const manifest = chosen?.manifest;
  if (!chosen || !manifest) return { kind: "ball" };
  if (prefs.mode === "live2d" && manifest.live2d && canShowLive2D(live2d)) {
    return { kind: "live2d", key: chosen.key, rendition: manifest.live2d };
  }
  return manifest.light ? { kind: "light", key: chosen.key, rendition: manifest.light } : { kind: "ball" };
}
