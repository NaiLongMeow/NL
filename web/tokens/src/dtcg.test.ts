import { describe, expect, it } from "vitest";
import { TokenError, parseTokens, resolvePart, resolveToken, type Token, type TokenSet } from "./dtcg.ts";

const srgb = (hex: string, alpha?: number) => {
  const value = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) => Math.round((((value >> shift) & 0xff) / 255) * 10000) / 10000;
  return {
    colorSpace: "srgb",
    components: [channel(16), channel(8), channel(0)],
    ...(alpha === undefined ? {} : { alpha }),
    hex,
  };
};
const px = (value: number) => ({ value, unit: "px" });

/** Parses and expects failure; returns the problems found. */
function problemsOf(json: unknown): readonly string[] {
  try {
    parseTokens(json);
  } catch (error) {
    if (error instanceof TokenError) return error.problems;
    throw error;
  }
  throw new Error("expected the tokens to be rejected");
}

function token(set: TokenSet, path: string): Token {
  const found = set.tokens.get(path);
  if (!found) throw new Error(`no token ${path}`);
  return found;
}

describe("parseTokens", () => {
  it("reads tokens in file order, with types inherited from groups", () => {
    const set = parseTokens({
      $description: "the file",
      size: { $type: "dimension", small: { $value: px(4) }, large: { $value: px(16), $description: "big" } },
      blue: { $type: "color", $value: srgb("#07618f") },
    });
    expect(set.description).toBe("the file");
    expect([...set.tokens.keys()]).toEqual(["size.small", "size.large", "blue"]);
    expect(token(set, "size.large")).toMatchObject({ type: "dimension", description: "big", value: { literal: { px: 16 } } });
    expect(token(set, "blue").value).toEqual({
      literal: { r: 0.0275, g: 0.3804, b: 0.5608, alpha: 1, hex: "#07618f" },
    });
  });

  it("gives an alias without $type the type of the token it points to, through a chain", () => {
    const set = parseTokens({
      base: { $type: "color", $value: srgb("#07618f") },
      // The group's $type does not apply: an alias takes its target's type.
      semantic: { $type: "dimension", accent: { $value: "{alias.middle}" } },
      alias: { middle: { $value: "{base}" } },
    });
    expect(token(set, "semantic.accent").type).toBe("color");
    expect(resolvePart(set, token(set, "semantic.accent").value)).toMatchObject({ hex: "#07618f" });
  });

  it("rejects an alias whose target has another type than the token declares", () => {
    expect(
      problemsOf({ base: { $type: "color", $value: srgb("#07618f") }, gap: { $type: "dimension", $value: "{base}" } }),
    ).toEqual(["gap: the alias {base} points to a color token where a dimension is required"]);
  });

  it("rejects aliases that point nowhere, with or without $type", () => {
    expect(
      problemsOf({ a: { $value: "{missing}" }, b: { $type: "number", $value: "{also.missing}" } }),
    ).toEqual(["a: the alias {missing} points to no token", "b: the alias {also.missing} points to no token"]);
  });

  it("rejects alias cycles, reporting every token in them", () => {
    const problems = problemsOf({ a: { $value: "{b}" }, b: { $value: "{a}" }, c: { $type: "number", $value: "{c}" } });
    expect(problems).toEqual([
      "a: aliases form a cycle: a -> b -> a",
      "b: aliases form a cycle: b -> a -> b",
      "c: aliases form a cycle: c -> c",
    ]);
  });

  it("rejects a token whose type cannot be determined, and does not guess from the value", () => {
    expect(problemsOf({ gap: { $value: px(4) } })).toEqual([
      "gap: has no $type, and none can be determined from an alias or a group",
    ]);
  });

  it("rejects types it does not support and types that do not exist", () => {
    expect(
      problemsOf({ fade: { $type: "gradient", $value: [] }, odd: { $type: "colour", $value: srgb("#000000") } }),
    ).toEqual(["fade: the type gradient is not supported by NL's token reader yet", "odd: unknown $type colour"]);
  });

  it("rejects format features it does not implement instead of ignoring them", () => {
    const problems = problemsOf({
      button: { $extends: "{base}", $type: "number", size: { $value: 1, $deprecated: true } },
      base: { $type: "number", $root: { $value: 2 } },
      pointer: { $type: "number", $value: { $ref: "#/base/size/$value" } },
    });
    expect(problems).toEqual([
      "group button: $extends is not supported by NL's token reader",
      "button.size: $deprecated is not supported by NL's token reader",
      "group base: $root is not supported by NL's token reader",
      "pointer: JSON Pointer references ($ref) are not supported by NL's token reader",
    ]);
  });

  it("rejects names that would not map onto CSS and Dart names", () => {
    expect(
      problemsOf({
        Color: { $type: "number", $value: 1 },
        "9lives": { $type: "number", $value: 1 },
        group: { $type: "number", "two--hyphens": { $value: 1 }, under_score: { $value: 1 }, "1": { $value: 1 } },
      }),
    ).toEqual([
      "Color: names must be lowercase kebab case (letters, digits, single hyphens)",
      "9lives: top-level names must start with a letter",
      "group.two--hyphens: names must be lowercase kebab case (letters, digits, single hyphens)",
      "group.under_score: names must be lowercase kebab case (letters, digits, single hyphens)",
    ]);
  });

  it("rejects a token that also holds tokens", () => {
    expect(problemsOf({ size: { $type: "number", $value: 1, small: { $value: 2 } } })).toEqual([
      "size: a token cannot also contain tokens or groups (small)",
    ]);
  });

  it("reports every problem at once", () => {
    const problems = problemsOf({ a: { $value: 1 }, b: { $type: "number", $value: "1" }, c: { $value: "{nowhere}" } });
    expect(problems).toHaveLength(3);
  });
});

describe("color values", () => {
  it("defaults alpha to 1 and keeps an explicit alpha", () => {
    const set = parseTokens({
      $type: "color",
      solid: { $value: srgb("#211d1a") },
      veil: { $value: srgb("#211d1a", 0.05) },
    });
    expect(resolvePart(set, token(set, "solid").value)).toMatchObject({ alpha: 1 });
    expect(resolvePart(set, token(set, "veil").value)).toMatchObject({ alpha: 0.05 });
  });

  it("rejects a hex fallback that disagrees with the components, and says what they should be", () => {
    expect(
      problemsOf({ c: { $type: "color", $value: { colorSpace: "srgb", components: [1, 0, 0], hex: "#00ff00" } } }),
    ).toEqual(["c: hex #00ff00 does not match the components; for #00ff00 they are [0, 1, 0]"]);
  });

  it.each([
    [{ colorSpace: "display-p3", components: [1, 0, 0], hex: "#ff0000" }, /only the srgb color space/],
    [{ colorSpace: "srgb", components: [1, 0, 0] }, /six-digit "hex" fallback/],
    [{ colorSpace: "srgb", components: [1.2, 0, 0], hex: "#ff0000" }, /three components from 0 to 1/],
    [{ colorSpace: "srgb", components: ["none", 0, 0], hex: "#000000" }, /keyword none is not supported/],
    [{ colorSpace: "srgb", components: [1, 0, 0], alpha: 2, hex: "#ff0000" }, /alpha must be a number from 0 to 1/],
    ["#ff0000", /a color must be an object/],
  ])("rejects %j", (value, message) => {
    const [problem] = problemsOf({ c: { $type: "color", $value: value } });
    expect(problem).toMatch(message);
  });
});

describe("other simple types", () => {
  it("reads px dimensions and rejects rem, which Flutter cannot use", () => {
    expect(parseTokens({ gap: { $type: "dimension", $value: px(8) } }).tokens.get("gap")?.value).toEqual({
      literal: { px: 8 },
    });
    expect(problemsOf({ gap: { $type: "dimension", $value: { value: 1, unit: "rem" } } })).toEqual([
      'gap: dimensions must use px (the Flutter app has no rem), not "rem"',
    ]);
  });

  it("normalizes durations to milliseconds", () => {
    const set = parseTokens({
      $type: "duration",
      quick: { $value: { value: 150, unit: "ms" } },
      slow: { $value: { value: 0.25, unit: "s" } },
    });
    expect(token(set, "quick").value).toEqual({ literal: { ms: 150 } });
    expect(token(set, "slow").value).toEqual({ literal: { ms: 250 } });
    expect(problemsOf({ d: { $type: "duration", $value: { value: 1, unit: "min" } } })[0]).toMatch(/"ms" or "s"/);
  });

  it("checks that a cubic Bézier's x values lie between 0 and 1", () => {
    expect(parseTokens({ e: { $type: "cubicBezier", $value: [0.4, -0.5, 0.2, 1.5] } }).tokens.get("e")?.value).toEqual({
      literal: [0.4, -0.5, 0.2, 1.5],
    });
    expect(problemsOf({ e: { $type: "cubicBezier", $value: [1.4, 0, 0.2, 1] } })).toEqual([
      "e: a cubicBezier's x values must lie between 0 and 1",
    ]);
  });

  it("maps font weight names to numbers and rejects unknown names", () => {
    const set = parseTokens({ $type: "fontWeight", a: { $value: "semi-bold" }, b: { $value: 450 } });
    expect(token(set, "a").value).toEqual({ literal: 600 });
    expect(token(set, "b").value).toEqual({ literal: 450 });
    expect(problemsOf({ w: { $type: "fontWeight", $value: "Bold" } })[0]).toMatch(/weight name/);
  });

  it("accepts a single font family name or a stack", () => {
    const set = parseTokens({ $type: "fontFamily", one: { $value: "Menlo" }, stack: { $value: ["Menlo", "monospace"] } });
    expect(token(set, "one").value).toEqual({ literal: ["Menlo"] });
    expect(token(set, "stack").value).toEqual({ literal: ["Menlo", "monospace"] });
    expect(problemsOf({ f: { $type: "fontFamily", $value: [] } })[0]).toMatch(/non-empty array/);
  });
});

describe("composite values", () => {
  const base = {
    ink: { $type: "color", $value: srgb("#211d1a", 0.1) },
    blur: { $type: "dimension", $value: px(16) },
    font: { $type: "fontFamily", $value: ["Inter", "sans-serif"] },
    size: { $type: "dimension", $value: px(16) },
  };

  it("reads a single shadow or several layers, with aliases inside", () => {
    const set = parseTokens({
      ...base,
      $type: "shadow",
      one: { $value: { color: "{ink}", offsetX: px(0), offsetY: px(1), blur: px(2), spread: px(0) } },
      two: {
        $value: [
          { color: "{ink}", offsetX: px(0), offsetY: px(1), blur: px(2), spread: px(0), inset: true },
          { color: "{ink}", offsetX: px(0), offsetY: px(4), blur: "{blur}", spread: px(0) },
        ],
      },
    });
    expect(resolveToken(set, token(set, "one"))).toHaveLength(1);
    expect(resolveToken(set, token(set, "two"))).toMatchObject([
      { inset: true, offsetY: { px: 1 } },
      { inset: false, blur: { px: 16 }, color: { hex: "#211d1a", alpha: 0.1 } },
    ]);
  });

  it("rejects shadow parts of the wrong type and unknown properties", () => {
    const problems = problemsOf({
      ...base,
      s: { $type: "shadow", $value: { color: "{blur}", offsetX: px(0), offsetY: px(1), blur: px(2), spread: px(0), x: 1 } },
    });
    expect(problems).toEqual([
      "s.color: the alias {blur} points to a dimension token where a color is required",
      "s: unknown shadow properties x",
    ]);
  });

  it("reads typography with every part, resolving aliases", () => {
    const set = parseTokens({
      ...base,
      body: {
        $type: "typography",
        $value: { fontFamily: "{font}", fontSize: "{size}", fontWeight: 400, letterSpacing: px(0), lineHeight: 1.5 },
      },
    });
    expect(resolveToken(set, token(set, "body"))).toEqual({
      fontFamily: ["Inter", "sans-serif"],
      fontSize: { px: 16 },
      fontWeight: 400,
      letterSpacing: { px: 0 },
      lineHeight: 1.5,
    });
  });

  it("requires every typography part", () => {
    const problems = problemsOf({
      ...base,
      body: { $type: "typography", $value: { fontFamily: "{font}", fontSize: "{size}", fontWeight: 400, lineHeight: 1.5 } },
    });
    expect(problems).toEqual(['body.letterSpacing: a dimension must be { "value": <number>, "unit": "px" }']);
  });
});
