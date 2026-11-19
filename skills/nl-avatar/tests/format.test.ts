import { describe, expect, it } from "vitest";
import {
  checkLive2DNames,
  checkManifest,
  checkModel3,
  displayInfoParameters,
  isAllowedFile,
  joinPackPath,
  localizedText,
  resolveState,
  STATE_FALLBACKS,
  STATES,
  type Issue,
} from "../scripts/lib/format.ts";
import { model3 } from "./fixtures.ts";

const FILES = new Set(["idle/1.png", "idle/2.png", "blink.png", "work.gif", "icon.png", "model/mochi.model3.json"]);

function lightManifest(light: Record<string, unknown> = {}) {
  return {
    nlAvatar: 1,
    id: "mochi",
    name: { en: "Mochi", "zh-CN": "麻糬" },
    author: "Jane",
    license: "CC BY 4.0",
    icon: "icon.png",
    light: {
      size: [128, 128],
      animations: {
        idle: { frames: ["idle/1.png", "idle/2.png"], fps: 6 },
        blink: { sheet: "blink.png", columns: 4, count: 4, loop: false },
        work: { image: "work.gif" },
      },
      states: { idle: "idle", working: "work" },
      idleExtras: [{ animation: "blink", every: [3, 8] }],
      pointer: { hover: "blink" },
      ...light,
    },
  };
}

function errors(issues: Issue[]) {
  return issues.filter((issue) => issue.level === "error").map((issue) => [issue.at, issue.code]);
}

describe("checkManifest", () => {
  it("accepts a complete light pack without issues", () => {
    const { manifest, issues } = checkManifest(lightManifest(), FILES);
    expect(issues).toEqual([]);
    expect(manifest?.id).toBe("mochi");
  });

  it("requires the version, an id, a name, and a rendition", () => {
    const { manifest, issues } = checkManifest({ id: "Not OK" }, FILES);
    expect(manifest).toBeNull();
    expect(errors(issues)).toEqual([
      ["nlAvatar", "missing"],
      ["id", "invalid"],
      ["name", "missing"],
      ["", "missing"],
    ]);
    expect(errors(checkManifest({ ...lightManifest(), nlAvatar: 2 }, FILES).issues)).toEqual([["nlAvatar", "invalid"]]);
    expect(errors(checkManifest("not an object", FILES).issues)).toEqual([["", "invalid"]]);
  });

  it("warns, without failing, about unknown keys and missing author or license", () => {
    const { author: _author, ...rest } = lightManifest();
    const { manifest, issues } = checkManifest({ ...rest, colour: "blue" }, FILES);
    expect(manifest).not.toBeNull();
    expect(issues.map((issue) => [issue.level, issue.at, issue.code])).toEqual([
      ["warning", "colour", "unknown-key"],
      ["warning", "author", "metadata"],
    ]);
  });

  it("checks names: plain text or language tags to text", () => {
    expect(errors(checkManifest({ ...lightManifest(), name: "" }, FILES).issues)).toEqual([["name", "invalid"]]);
    expect(errors(checkManifest({ ...lightManifest(), name: { english: "Mochi" } }, FILES).issues)).toEqual([["name.english", "invalid"]]);
    expect(errors(checkManifest({ ...lightManifest(), name: {} }, FILES).issues)).toEqual([["name", "invalid"]]);
  });

  it("names missing files, and points out a difference in letter case", () => {
    const manifest = lightManifest({
      animations: { idle: { frames: ["idle/1.png", "Idle/2.png", "idle/3.png"] } },
      states: { idle: "idle" },
      idleExtras: [],
      pointer: {},
    });
    const issues = checkManifest(manifest, FILES).issues.filter((issue) => issue.level === "error");
    expect(issues.map((issue) => [issue.at, issue.code])).toEqual([
      ["light.animations.idle.frames[1]", "missing-file"],
      ["light.animations.idle.frames[2]", "missing-file"],
    ]);
    expect(issues[0]!.message).toContain(`"idle/2.png" is`);
  });

  it("requires idle, known cue names, and animations that exist", () => {
    const manifest = lightManifest({ states: { working: "work", dancing: "work", thinking: "nope" }, gestures: { wave: "idle", jump: "idle" } });
    expect(errors(checkManifest(manifest, FILES).issues)).toEqual([
      ["light.states.idle", "missing"],
      ["light.states.dancing", "invalid"],
      ["light.states.thinking", "unknown-name"],
      ["light.gestures.jump", "invalid"],
    ]);
  });

  it("wants exactly one kind of animation, and a sheet's grid", () => {
    const manifest = lightManifest({
      animations: {
        idle: { frames: ["idle/1.png"], image: "work.gif" },
        blink: { sheet: "blink.png" },
        work: { image: "work.gif", columns: 2 },
        empty: {},
        fast: { frames: ["idle/1.png"], fps: 120 },
        icon: { image: "model/mochi.model3.json" },
      },
      states: { idle: "idle" },
      idleExtras: [{ animation: "blink", every: [9, 3] }],
      pointer: {},
    });
    expect(errors(checkManifest(manifest, FILES).issues)).toEqual([
      ["light.animations.idle", "invalid"],
      ["light.animations.blink.columns", "invalid"],
      ["light.animations.blink.count", "invalid"],
      ["light.animations.work.columns", "invalid"],
      ["light.animations.empty", "invalid"],
      ["light.animations.fast.fps", "invalid"],
      ["light.animations.icon.image", "wrong-file-type"],
      ["light.idleExtras[0].every", "invalid"],
    ]);
  });

  it("checks the size and the anchor", () => {
    expect(errors(checkManifest(lightManifest({ size: [8, 4000] }), FILES).issues)).toEqual([["light.size", "invalid"]]);
    expect(errors(checkManifest(lightManifest({ anchor: [64, 200] }), FILES).issues)).toEqual([["light.anchor", "invalid"]]);
    expect(errors(checkManifest(lightManifest({ anchor: [64, 128] }), FILES).issues)).toEqual([]);
  });

  it("refuses paths that would leave the pack", () => {
    const manifest = lightManifest({ animations: { idle: { image: "../secret.png" } }, states: { idle: "idle" }, idleExtras: [], pointer: {} });
    expect(errors(checkManifest(manifest, FILES).issues)).toEqual([["light.animations.idle.image", "invalid"]]);
  });

  it("checks the Live2D rendition's shape", () => {
    const manifest = {
      nlAvatar: 1,
      id: "mochi",
      name: "Mochi",
      author: "Jane",
      license: "Personal use",
      live2d: {
        model: "model/mochi.model3.json",
        framing: { zoom: 20, x: 0.5 },
        parameters: { angleX: "PARAM_ANGLE_X", tail: "Tail" },
        base: {},
        states: { working: { expression: "smile", params: { ParamEyeSmile: 0.3 } }, resting: { expression: "smile" } },
        expressions: { happy: { params: { ParamEyeSmile: "much" } } },
        gestures: { wave: { motion: "Wave" }, nod: {} },
      },
    };
    expect(errors(checkManifest(manifest, FILES).issues)).toEqual([
      ["live2d.framing.zoom", "invalid"],
      ["live2d.parameters.tail", "invalid"],
      ["live2d.base", "invalid"],
      ["live2d.states.resting", "invalid"],
      ["live2d.expressions.happy.params.ParamEyeSmile", "invalid"],
      ["live2d.gestures.nod", "invalid"],
    ]);
    expect(errors(checkManifest({ ...manifest, live2d: { model: "model/mochi.json" } }, FILES).issues)).toEqual([["live2d.model", "wrong-file-type"]]);
  });
});

describe("checkModel3", () => {
  const files = new Set([
    "model/mochi.model3.json",
    "model/mochi.moc3",
    "model/mochi.2048/texture_00.png",
    "model/mochi.physics3.json",
    "model/mochi.cdi3.json",
    "model/exp/smile.exp3.json",
    "model/exp/blush.exp3.json",
    "model/motions/wave.motion3.json",
  ]);

  it("resolves the model's files relative to it and lists its names", () => {
    const { facts, issues } = checkModel3(model3(), "model/mochi.model3.json", files);
    expect(issues).toEqual([]);
    expect(facts).toMatchObject({
      moc: "model/mochi.moc3",
      displayInfo: "model/mochi.cdi3.json",
      expressions: ["smile", "blush"],
      motionGroups: ["Wave"],
    });
    expect(facts?.files).toContain("model/exp/blush.exp3.json");
  });

  it("reports missing files and references that leave the pack", () => {
    const broken = model3();
    broken.FileReferences.Moc = "../../outside.moc3";
    broken.FileReferences.Textures = ["mochi.2048/texture_01.png"];
    const { facts, issues } = checkModel3(broken, "model/mochi.model3.json", files);
    expect(facts).toBeNull();
    expect(errors(issues)).toEqual([
      ["model/mochi.model3.json FileReferences.Moc", "invalid"],
      ["model/mochi.model3.json FileReferences.Textures[0]", "missing-file"],
    ]);
  });

  it("explains that a Cubism 2 model is not a Cubism 3 model", () => {
    const { issues } = checkModel3({ model: "old.moc", textures: [] }, "model.json", files);
    expect(issues[0]?.message).toContain("Cubism 2");
  });
});

describe("checkLive2DNames", () => {
  const facts = { files: [], moc: "m.moc3", displayInfo: null, expressions: ["smile"], motionGroups: ["Wave"] };

  it("finds expressions, motion groups, and parameters the model does not have", () => {
    const live2d = {
      model: "m.model3.json",
      parameters: { angleX: "ParamAngleX", angleY: "PARAM_Y" },
      states: { working: { expression: "focus", params: { ParamEyeSmile: 1, ParamNope: 1 } } },
      gestures: { wave: { motion: "Wave" }, nod: { motion: "Nod" } },
    };
    expect(checkLive2DNames(live2d, facts, ["ParamAngleX", "ParamEyeSmile"]).map((issue) => issue.at)).toEqual([
      "live2d.states.working.expression",
      "live2d.states.working.params.ParamNope",
      "live2d.gestures.nod.motion",
      "live2d.parameters.angleY",
    ]);
    // Without the model's parameter list, ids cannot be checked, and are not.
    expect(checkLive2DNames(live2d, facts, null).map((issue) => issue.at)).toEqual(["live2d.states.working.expression", "live2d.gestures.nod.motion"]);
  });

  it("reads parameter ids from display info", () => {
    expect(displayInfoParameters({ Parameters: [{ Id: "A" }, { Name: "no id" }, { Id: "B" }] })).toEqual(["A", "B"]);
    expect(displayInfoParameters({ Version: 3 })).toBeNull();
  });
});

describe("cues", () => {
  it("lets every state fall back to idle", () => {
    for (const state of STATES) {
      const chain = STATE_FALLBACKS[state];
      expect(state === "idle" || chain[chain.length - 1] === "idle").toBe(true);
    }
    expect(resolveState({ idle: "a", working: "b" }, "thinking")).toBe("b");
    expect(resolveState({ idle: "a", question: "q" }, "approval")).toBe("q");
    expect(resolveState({ idle: "a", sleeping: "z" }, "offline")).toBe("z");
    expect(resolveState({ idle: "a" }, "error")).toBe("a");
    expect(resolveState({}, "error")).toBeUndefined();
  });
});

describe("paths and names", () => {
  it("allows data files at safe paths only", () => {
    expect(isAllowedFile("idle/01.PNG")).toBe(true);
    expect(isAllowedFile("model/x.moc3")).toBe(true);
    for (const path of ["stage.js", "a.svg", "page.html", "core.wasm", "LICENSE", ".hidden", "../a.png", "a\\b.png", "C:/a.png", "a//b.png"]) {
      expect(isAllowedFile(path), path).toBe(false);
    }
  });

  it("joins references inside the pack and refuses ones that leave it", () => {
    expect(joinPackPath("model", "mochi.moc3")).toBe("model/mochi.moc3");
    expect(joinPackPath("model/sub", "../tex/a.png")).toBe("model/tex/a.png");
    expect(joinPackPath("", "./a.png")).toBe("a.png");
    expect(joinPackPath("model", "../../a.png")).toBeNull();
    expect(joinPackPath("model", "/etc/a.png")).toBeNull();
    expect(joinPackPath("model", "C:\\a.png")).toBeNull();
  });

  it("picks a name in the user's language", () => {
    const name = { en: "Mochi", "zh-CN": "麻糬" };
    expect(localizedText(name, "zh-CN")).toBe("麻糬");
    expect(localizedText(name, "zh-TW")).toBe("麻糬");
    expect(localizedText(name, "fr")).toBe("Mochi");
    expect(localizedText("Mochi", "zh-CN")).toBe("Mochi");
  });
});
