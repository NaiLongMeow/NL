import { existsSync, readdirSync, readFileSync, symlinkSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { APP_IDENTIFIER, caseClashes, checkFolder, defaultAvatarsFolder, inspectFolder, installFolder, InstallError, listFolder } from "../scripts/lib/pack.ts";
import { gif, live2dFiles, moc3, png, removeFolder, writePack } from "./fixtures.ts";

const folders: string[] = [];
function pack(files: Parameters<typeof writePack>[0]) {
  const folder = writePack(files);
  folders.push(folder);
  return folder;
}
afterEach(() => {
  for (const folder of folders.splice(0)) removeFolder(folder);
});

function lightPack(extra: Record<string, unknown> = {}, files: Parameters<typeof writePack>[0] = {}) {
  return pack({
    "avatar.json": {
      nlAvatar: 1,
      id: "mochi",
      name: "Mochi",
      author: "Jane",
      license: "CC BY 4.0",
      light: {
        size: [64, 64],
        animations: {
          idle: { frames: ["idle/1.png", "idle/2.png"] },
          blink: { sheet: "blink.png", columns: 2, count: 4, loop: false },
          work: { image: "work.gif" },
        },
        states: { idle: "idle", working: "work" },
        ...extra,
      },
    },
    "idle/1.png": png(64, 64),
    "idle/2.png": png(64, 64),
    "blink.png": png(128, 128),
    "work.gif": gif(64, 64, 6),
    ...files,
  });
}

function live2dPack(live2d: Record<string, unknown> = {}, files: Parameters<typeof writePack>[0] = {}) {
  return pack({
    "avatar.json": { nlAvatar: 1, id: "mochi-l2d", name: "Mochi", author: "Jane", license: "Personal use", live2d: { model: "model/mochi.model3.json", ...live2d } },
    ...live2dFiles(),
    ...files,
  });
}

function codes(folder: string) {
  return checkFolder(folder).issues.map((issue) => [issue.level, issue.at, issue.code]);
}

describe("checkFolder", () => {
  it("accepts a light pack whose images match it", () => {
    const result = checkFolder(lightPack());
    expect(result.issues).toEqual([]);
    expect(result.manifest?.id).toBe("mochi");
    expect(result.files.map((file) => file.path)).toEqual(["avatar.json", "blink.png", "idle/1.png", "idle/2.png", "work.gif"]);
  });

  it("refuses a sheet too small for its frames, and warns about frames of another size", () => {
    const folder = lightPack({}, { "blink.png": png(128, 64), "idle/2.png": png(60, 64) });
    expect(codes(folder)).toEqual([
      ["warning", "light.animations.idle.frames[1]", "invalid"],
      ["error", "light.animations.blink.sheet", "invalid"],
    ]);
    expect(checkFolder(folder).manifest).toBeNull();
  });

  it("refuses files that are not the images they claim to be", () => {
    expect(codes(lightPack({}, { "work.gif": "GIF? no" }))).toEqual([["error", "light.animations.work.image", "unreadable"]]);
  });

  it("leaves out files the format does not allow", () => {
    const folder = lightPack({}, { "readme.html": "<p>hi</p>", "source.psd": "psd" });
    expect(codes(folder)).toEqual([
      ["warning", "readme.html", "file-not-allowed"],
      ["warning", "source.psd", "file-not-allowed"],
    ]);
  });

  it("finds names that clash by case", () => {
    // Such files cannot be made side by side on Windows or macOS, where these tests also run.
    expect(caseClashes(["blink.png", "idle/1.png", "Blink.PNG", "BLINK.png"])).toEqual([
      ["Blink.PNG", "blink.png"],
      ["BLINK.png", "blink.png"],
    ]);
  });

  it("reports a missing or broken manifest", () => {
    expect(codes(pack({ "idle.png": png(10, 10) }))).toEqual([["error", "avatar.json", "missing-file"]]);
    expect(codes(pack({ "avatar.json": "{ nlAvatar: 1, }" }))).toEqual([["error", "avatar.json", "invalid"]]);
    // A byte-order mark, which Windows editors like to write, is allowed.
    const withBom = pack({ "avatar.json": `\uFEFF${JSON.stringify({ nlAvatar: 1, id: "a", name: "A", author: "x", license: "y", light: { size: [16, 16], animations: { idle: { image: "a.png" } }, states: { idle: "idle" } } })}`, "a.png": png(16, 16) });
    expect(codes(withBom)).toEqual([]);
  });

  it("accepts a Live2D pack and checks its model's names", () => {
    expect(codes(live2dPack({ states: { working: { expression: "smile", params: { ParamEyeSmile: 0.4 } } }, gestures: { wave: { motion: "Wave" } } }))).toEqual([]);
    expect(codes(live2dPack({ expressions: { happy: { expression: "grin", params: { ParamGrin: 1 } } } }))).toEqual([
      ["error", "live2d.expressions.happy.expression", "unknown-name"],
      ["error", "live2d.expressions.happy.params.ParamGrin", "unknown-name"],
    ]);
  });

  it("refuses a moc3 that is not one, and a model file that names missing files", () => {
    expect(codes(live2dPack({}, { "model/mochi.moc3": "not a moc" }))).toEqual([["error", "model/mochi.moc3", "unreadable"]]);
    const files = live2dFiles();
    delete files["model/exp/blush.exp3.json"];
    const folder = pack({ "avatar.json": { nlAvatar: 1, id: "x", name: "X", author: "a", license: "b", live2d: { model: "model/mochi.model3.json" } }, ...files });
    expect(codes(folder)).toEqual([["error", "model/mochi.model3.json FileReferences.Expressions[1].File", "missing-file"]]);
  });

  it("does not follow symbolic links", () => {
    const folder = lightPack();
    try {
      symlinkSync(`${folder}/idle/1.png`, `${folder}/link.png`);
    } catch {
      return; // Creating links needs extra rights on Windows; nothing to test then.
    }
    expect(listFolder(folder).skipped).toEqual([{ path: "link.png", reason: "symlink" }]);
  });
});

describe("inspectFolder", () => {
  it("lists images with their size and frames, and Live2D models with their names", () => {
    const folder = pack({ "walk.gif": gif(48, 48, 8), "still.png": png(48, 48), "notes.txt": "hi", "character.json": { name: "Mochi" }, ...live2dFiles() });
    const inventory = inspectFolder(folder);
    expect(inventory.hasManifest).toBe(false);
    expect(inventory.otherJson).toEqual(["character.json"]);
    expect(inventory.images).toContainEqual({ path: "walk.gif", format: "gif", width: 48, height: 48, frames: 8 });
    expect(inventory.live2d).toHaveLength(1);
    expect(inventory.live2d[0]).toMatchObject({
      model: "model/mochi.model3.json",
      moc: "model/mochi.moc3",
      mocVersion: 5,
      expressions: [
        { name: "smile", file: "model/exp/smile.exp3.json" },
        { name: "blush", file: "model/exp/blush.exp3.json" },
      ],
      motionGroups: { Wave: 1 },
      hitAreas: ["Head"],
      eyeBlink: ["ParamEyeLOpen", "ParamEyeROpen"],
      physics: true,
      problems: [],
    });
    expect(inventory.live2d[0]!.parameters).toContainEqual({ id: "ParamEyeSmile", name: "Eye smile", group: "" });
    expect(moc3(6)[4]).toBe(6);
  });
});

describe("installFolder", () => {
  it("copies the allowed files into avatars/<id> and replaces only when asked", () => {
    const source = lightPack({}, { "draft.psd": "psd" });
    const avatars = pack({ "keep.txt": "other files stay" });
    const installed = installFolder(source, avatars);
    expect(installed.path).toBe(`${avatars}/mochi`);
    expect(readdirSync(installed.path).sort()).toEqual(["avatar.json", "blink.png", "idle", "work.gif"]);
    expect(existsSync(`${avatars}/keep.txt`)).toBe(true);

    expect(() => installFolder(source, avatars)).toThrow(/already installed/);
    installFolder(lightPack({}, { "work.gif": gif(64, 64, 9) }), avatars, { replace: true });
    expect(readFileSync(`${avatars}/mochi/work.gif`).length).toBe(gif(64, 64, 9).length);
    // No staging or replaced copies are left behind.
    expect(readdirSync(avatars).sort()).toEqual(["keep.txt", "mochi"]);
  });

  it("refuses a pack with errors", () => {
    const avatars = pack({});
    try {
      installFolder(lightPack({ states: {} }), avatars);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InstallError);
      expect((error as InstallError).result.issues.some((issue) => issue.level === "error")).toBe(true);
    }
    expect(readdirSync(avatars)).toEqual([]);
  });
});

describe("defaultAvatarsFolder", () => {
  it("is the desktop app's local data folder on each system", () => {
    expect(defaultAvatarsFolder("win32", { LOCALAPPDATA: "C:\\Users\\me\\AppData\\Local" }, "C:\\Users\\me")).toBe(
      "C:\\Users\\me\\AppData\\Local\\dev.nailongmeow.nl\\avatars",
    );
    expect(defaultAvatarsFolder("darwin", {}, "/Users/me")).toBe("/Users/me/Library/Application Support/dev.nailongmeow.nl/avatars");
    expect(defaultAvatarsFolder("linux", {}, "/home/me")).toBe("/home/me/.local/share/dev.nailongmeow.nl/avatars");
    expect(defaultAvatarsFolder("linux", { XDG_DATA_HOME: "/data" }, "/home/me")).toBe("/data/dev.nailongmeow.nl/avatars");
  });

  it("uses the identifier the desktop app is built with", () => {
    const config = new URL("../../../apps/desktop/src-tauri/tauri.conf.json", import.meta.url);
    // Only inside the NL repository; an installed copy of the skill has no app beside it.
    if (!existsSync(config)) return;
    expect(JSON.parse(readFileSync(config, "utf8")).identifier).toBe(APP_IDENTIFIER);
  });
});
