import type { AvatarManifest } from "@nl/avatar-skill/format";
import { describe, expect, it } from "vitest";
import type { CheckedAvatar } from "../avatars/avatars";
import { DEFAULT_PET, PET_KEY, chooseLook, loadPetPrefs, parsePetPrefs, savePetPrefs } from "./look";

const light = { size: [64, 64] as [number, number], animations: { idle: { image: "idle.gif" } }, states: { idle: "idle" } };
const live2d = { model: "m.model3.json" };

function avatar(key: string, renditions: Partial<Pick<AvatarManifest, "light" | "live2d">>): CheckedAvatar {
  return { key, development: false, problem: null, manifest: { nlAvatar: 1, id: key, name: key, ...renditions } };
}

const avatars = [avatar("cat", { light }), avatar("whale", { light, live2d }), avatar("girl", { live2d })];

describe("chooseLook", () => {
  it("shows the ball in light mode until an avatar is chosen", () => {
    expect(chooseLook(DEFAULT_PET, avatars, "ready")).toEqual({ kind: "ball" });
    expect(chooseLook({ ...DEFAULT_PET, light: "cat" }, avatars, "ready")).toEqual({ kind: "light", key: "cat", rendition: light });
  });

  it("shows the chosen Live2D avatar when this build can run Live2D", () => {
    const prefs = { ...DEFAULT_PET, mode: "live2d" as const, live2d: "whale" };
    expect(chooseLook(prefs, avatars, "ready")).toEqual({ kind: "live2d", key: "whale", rendition: live2d });
    expect(chooseLook(prefs, avatars, "development").kind).toBe("live2d");
  });

  it("falls back to the avatar's light form, then to the ball, never to nothing", () => {
    expect(chooseLook({ ...DEFAULT_PET, mode: "live2d", live2d: "whale" }, avatars, "no-runtime")).toEqual({ kind: "light", key: "whale", rendition: light });
    expect(chooseLook({ ...DEFAULT_PET, mode: "live2d", live2d: "girl" }, avatars, "runtime-refused")).toEqual({ kind: "ball" });
    expect(chooseLook({ ...DEFAULT_PET, mode: "live2d", live2d: null }, avatars, "ready")).toEqual({ kind: "ball" });
    expect(chooseLook({ ...DEFAULT_PET, light: "gone" }, avatars, "ready")).toEqual({ kind: "ball" });
    const broken: CheckedAvatar = { key: "cat", development: false, manifest: null, problem: { kind: "pack", problem: "no-manifest" } };
    expect(chooseLook({ ...DEFAULT_PET, light: "cat" }, [broken], "ready")).toEqual({ kind: "ball" });
  });
});

describe("pet settings", () => {
  it("read back what was saved, and take the default for anything unknown", () => {
    const store = new Map<string, string>();
    const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value) };
    savePetPrefs({ shown: false, mode: "live2d", light: "cat", live2d: "whale" }, storage);
    expect(store.has(PET_KEY)).toBe(true);
    expect(loadPetPrefs(storage)).toEqual({ shown: false, mode: "live2d", light: "cat", live2d: "whale" });
    expect(parsePetPrefs("not json")).toEqual(DEFAULT_PET);
    expect(parsePetPrefs(JSON.stringify({ mode: "3d", light: 5, live2d: "" }))).toEqual(DEFAULT_PET);
    expect(parsePetPrefs(null)).toEqual(DEFAULT_PET);
  });

  it("show the pet unless the user hid it, settings saved before the switch existed included", () => {
    expect(DEFAULT_PET.shown).toBe(true);
    expect(parsePetPrefs(JSON.stringify({ mode: "light", light: "cat" })).shown).toBe(true);
    expect(parsePetPrefs(JSON.stringify({ shown: "no" })).shown).toBe(true);
    expect(parsePetPrefs(JSON.stringify({ shown: false })).shown).toBe(false);
  });
});
