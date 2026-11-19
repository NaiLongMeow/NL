/**
 * How the main window tells the pet window what to show: the character's
 * cue (the state of the session open in the main window, UI design note,
 * section 6) and the pet settings, as Tauri events. The pet asks for the
 * current cue when it starts, since it may start after the main window sent
 * one. Whether the pet is shown, and its right-click menu, go through the
 * app (src-tauri/src/pet.rs), which also tells the main window when the pet
 * is hidden from its menu. Outside the desktop app nothing is sent and
 * nothing arrives.
 */

import { invoke, isTauri } from "@tauri-apps/api/core";
import { emit, emitTo, listen } from "@tauri-apps/api/event";
import type { AvatarCue } from "../ui/Avatar";
import type { PetPrefs } from "./look";

/** The pet window's label in tauri.conf.json. */
const PET = "pet";
const CUE = "nl-pet-cue";
const PREFS = "nl-pet-prefs";
const READY = "nl-pet-ready";
/** Sent by the app (pet.rs) whenever the pet is shown or hidden. */
const SHOWN = "nl-pet-shown";
/** Sent by the app (pet.rs) to the main window when the pet's menu asks for Settings. */
const OPEN_SETTINGS = "nl-open-settings";

let lastCue: AvatarCue = "idle";

/** Main window: tells the pet what the character is doing now. */
export function publishCue(cue: AvatarCue) {
  lastCue = cue;
  if (isTauri()) emitTo(PET, CUE, cue).catch(() => {});
}

/** Main window: tells the pet that its settings changed. */
export function publishPrefs(prefs: PetPrefs) {
  if (isTauri()) emitTo(PET, PREFS, prefs).catch(() => {});
}

/** Main window: answers a pet that has just started with the current cue. Returns the function that stops answering. */
export function answerPet(): () => void {
  if (!isTauri()) return () => {};
  const stop = listen(READY, () => publishCue(lastCue));
  return () => void stop.then((unlisten) => unlisten());
}

/** Main window: shows or hides the pet. */
export function setPetShown(shown: boolean) {
  if (isTauri()) invoke("set_pet_shown", { shown }).catch(() => {});
}

/**
 * Main window: calls `onShown` when the pet is shown or hidden, whoever did
 * it, and `onOpenSettings` when the pet's menu asks for Settings. Returns the
 * function that stops the calls.
 */
export function followPet(onShown: (shown: boolean) => void, onOpenSettings: () => void): () => void {
  if (!isTauri()) return () => {};
  const listeners = [listen<boolean>(SHOWN, (event) => onShown(event.payload)), listen(OPEN_SETTINGS, () => onOpenSettings())];
  return () => {
    for (const listener of listeners) void listener.then((unlisten) => unlisten());
  };
}

/** The words of the pet's menu, in the user's language. */
export interface PetMenuLabels {
  open: string;
  settings: string;
  hide: string;
  quit: string;
}

/** Pet window: opens its menu where the pointer is (pet.rs). */
export function openPetMenu(labels: PetMenuLabels) {
  if (isTauri()) invoke("pet_menu", { labels }).catch(() => {});
}

/** Pet window: receives cues and settings, then says it is ready. Returns the function that stops receiving. */
export function subscribePet(onCue: (cue: AvatarCue) => void, onPrefs: (prefs: PetPrefs) => void): () => void {
  if (!isTauri()) return () => {};
  const listeners = [listen<AvatarCue>(CUE, (event) => onCue(event.payload)), listen<PetPrefs>(PREFS, (event) => onPrefs(event.payload))];
  void Promise.all(listeners).then(() => emit(READY));
  return () => {
    for (const listener of listeners) void listener.then((unlisten) => unlisten());
  };
}
