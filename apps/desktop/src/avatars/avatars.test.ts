import { describe, expect, it } from "vitest";
import { avatarFileUrl, checkAvatar, runtimeFileUrl, type AvatarEntry } from "./avatars";

function entry(manifest: unknown, files: string[], extra: Partial<AvatarEntry> = {}): AvatarEntry {
  return { key: "mochi", manifest: JSON.stringify(manifest), files: ["avatar.json", ...files], skipped: [], problem: null, development: false, ...extra };
}

const valid = {
  nlAvatar: 1,
  id: "mochi",
  name: "Mochi",
  author: "Jane",
  license: "CC BY 4.0",
  light: { size: [64, 64], animations: { idle: { image: "idle.gif" } }, states: { idle: "idle" } },
};

describe("checkAvatar", () => {
  it("accepts a pack whose manifest passes the format's checks", () => {
    const checked = checkAvatar(entry(valid, ["idle.gif"]));
    expect(checked.problem).toBeNull();
    expect(checked.manifest?.id).toBe("mochi");
  });

  it("reports the folder's problem, the manifest's first error, or a folder named after another id", () => {
    expect(checkAvatar(entry(null, [], { manifest: null, problem: "too-large" })).problem).toEqual({ kind: "pack", problem: "too-large" });
    expect(checkAvatar(entry(valid, [])).problem).toMatchObject({ kind: "manifest", issue: { at: "light.animations.idle.image", code: "missing-file" } });
    expect(checkAvatar({ ...entry(valid, []), manifest: "{ nope" }).problem).toMatchObject({ kind: "manifest", issue: { code: "invalid" } });
    expect(checkAvatar(entry({ ...valid, id: "other" }, ["idle.gif"])).problem).toEqual({ kind: "folder", id: "other" });
    // A development pack is known by its id, whatever its folder is called.
    expect(checkAvatar(entry({ ...valid, id: "other" }, ["idle.gif"], { key: "other", development: true })).problem).toBeNull();
  });

  it("reads a manifest saved with a byte-order mark", () => {
    expect(checkAvatar({ ...entry(valid, ["idle.gif"]), manifest: `\uFEFF${JSON.stringify(valid)}` }).problem).toBeNull();
  });
});

describe("nlavatar URLs", () => {
  it("name the pack and the file, each part escaped", () => {
    expect(avatarFileUrl("sea-slime", "海盐.2048/texture 00.png")).toMatch(
      /(nlavatar:\/\/localhost|http:\/\/nlavatar\.localhost)\/a\/sea-slime\/%E6%B5%B7%E7%9B%90\.2048\/texture%2000\.png$/,
    );
    expect(runtimeFileUrl("shaders/")).toMatch(/\/runtime\/shaders\/$/);
  });
});
