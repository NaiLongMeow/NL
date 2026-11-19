/**
 * How the main window tells the pet window what to show: the character's
 * cue (the state of the session open in the main window, UI design note,
 * section 6) and the pet settings, as Tauri events. The pet asks for the
 * current cue when it starts, since it may start after the main window sent
 * one. Outside the desktop app nothing is sent and nothing arrives.
 */

import { isTauri } from "@tauri-apps/api/core";
import { emit, emitTo, listen } from "@tauri-apps/api/event";
import type { AvatarCue } from "../ui/Avatar";
import type { PetPrefs } from "./look";

/** The pet window's label in tauri.conf.json. */
const PET = "pet";
const CUE = "nl-pet-cue";
const PREFS = "nl-pet-prefs";
const READY = "nl-pet-ready";

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

/** Pet window: receives cues and settings, then says it is ready. Returns the function that stops receiving. */
export function subscribePet(onCue: (cue: AvatarCue) => void, onPrefs: (prefs: PetPrefs) => void): () => void {
  if (!isTauri()) return () => {};
  const listeners = [listen<AvatarCue>(CUE, (event) => onCue(event.payload)), listen<PetPrefs>(PREFS, (event) => onPrefs(event.payload))];
  void Promise.all(listeners).then(() => emit(READY));
  return () => {
    for (const listener of listeners) void listener.then((unlisten) => unlisten());
  };
}
