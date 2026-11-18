/**
 * Checks NL's actual tokens (design/tokens.json) against the rules of the
 * UI design note (docs/design/ui.md, sections 3 and 11), and checks the
 * generated TypeScript that the test script has just written.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { compositeOver, contrastRatio, hueDistance, rgbToOklch, type Rgb } from "./color.ts";
import { parseTokens, resolveToken, type Resolved, type Token } from "./dtcg.ts";
import { THEMES, buildDesign, relativePath, type ThemeName } from "./model.ts";
import { OUTPUTS, SOURCE, generate } from "./generate.ts";
import { themes, tokens } from "../generated/tokens.ts";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const json: unknown = JSON.parse(readFileSync(`${root}${SOURCE}`, "utf8"));
const design = buildDesign(parseTokens(json));

/** A theme's resolved colors by relative path, such as "color.surface.app". */
function colors(theme: ThemeName): Map<string, Resolved<"color">> {
  return new Map(
    design.themes[theme]
      .filter((token): token is Token & { type: "color" } => token.type === "color")
      .map((token) => [relativePath(token.path).join("."), resolveToken(design.set, token)]),
  );
}

function rgb(color: Resolved<"color">): Rgb {
  return { r: color.r, g: color.g, b: color.b };
}

const SURFACES = ["surface.app", "surface.sidebar", "surface.raised", "surface.sunken", "surface.overlay"];
const BUBBLES = ["bubble.user", "bubble.character"];

/**
 * Text and its backgrounds must meet WCAG 2.2 AA: 4.5:1 for text, 3:1 for
 * icons, focus rings, and borders that identify a control. Body text gets
 * 7:1 (AAA). Each entry: foreground, backgrounds, minimum ratio.
 */
const CONTRAST: Array<[string, string[], number]> = [
  ["ink.primary", [...SURFACES, ...BUBBLES, "danger.soft", "warning.soft"], 7],
  ["ink.secondary", [...SURFACES, ...BUBBLES], 4.5],
  ["ink.tertiary", SURFACES, 4.5],
  ["ink.link", [...SURFACES, ...BUBBLES], 4.5],
  ["ink.inverse", ["surface.inverse"], 4.5],
  ["line.strong", SURFACES, 3],
  ["focus", [...SURFACES, ...BUBBLES], 3],
  ["action.on-fill", ["action.fill"], 4.5],
  ["accent.fill", ["surface.app", "surface.raised"], 3],
  ["accent.on-fill", ["accent.fill"], 4.5],
  ["accent.text", [...SURFACES, "accent.soft"], 4.5],
  ["danger.on-fill", ["danger.fill"], 4.5],
  ["danger.text", [...SURFACES, "danger.soft"], 4.5],
  ["warning.icon", [...SURFACES, "warning.soft"], 3],
  ["warning.text", [...SURFACES, "warning.soft"], 4.5],
  ["mic.fill", SURFACES, 3],
];

describe.each(THEMES)("the %s theme", (theme) => {
  const palette = colors(theme);
  const color = (name: string) => {
    const found = palette.get(`color.${name}`);
    if (!found) throw new Error(`no color.${name} in the ${theme} theme`);
    return found;
  };

  it.each(CONTRAST)("%s meets %s at %d:1", (foreground, backgrounds, minimum) => {
    for (const background of backgrounds) {
      expect(color(background).alpha, `${background} must be opaque`).toBe(1);
      const ratio = contrastRatio(rgb(color(foreground)), rgb(color(background)));
      expect(ratio, `${foreground} on ${background}`).toBeGreaterThanOrEqual(minimum);
    }
  });

  it("keeps text readable on hovered, pressed, and selected rows", () => {
    for (const state of ["state.hover", "state.pressed", "state.selected"]) {
      for (const surface of ["surface.app", "surface.sidebar", "surface.raised", "surface.overlay"]) {
        const background = compositeOver(rgb(color(state)), color(state).alpha, rgb(color(surface)));
        expect(contrastRatio(rgb(color("ink.primary")), background), `ink.primary on ${state} over ${surface}`).toBeGreaterThanOrEqual(7);
        expect(contrastRatio(rgb(color("ink.secondary")), background), `ink.secondary on ${state} over ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("keeps every other hue at least 30 degrees from the reserved microphone hue", () => {
    // Product rule 8 and the design note: "microphone on" has a hue of its
    // own on every end. Neutrals (chroma below 0.03) have no real hue.
    const micHue = rgbToOklch(rgb(color("mic.fill"))).h;
    for (const [name, value] of palette) {
      if (name.startsWith("color.mic.")) continue;
      const oklch = rgbToOklch(rgb(value));
      if (oklch.c < 0.03) continue;
      expect(hueDistance(oklch.h, micHue), `${name} against mic.fill`).toBeGreaterThanOrEqual(30);
    }
  });
});

describe("global tokens", () => {
  const byPath = (prefix: string) =>
    design.global.filter((token) => token.path.join(".").startsWith(prefix));

  it("keep interface motion between 150 and 250 ms", () => {
    for (const token of byPath("motion.duration.")) {
      const { ms } = resolveToken(design.set, token as Token & { type: "duration" });
      expect(ms, token.path.join(".")).toBeGreaterThanOrEqual(150);
      expect(ms, token.path.join(".")).toBeLessThanOrEqual(250);
    }
  });

  it("never bounce: every easing stays between its start and end values", () => {
    for (const token of byPath("motion.easing.")) {
      const [, y1, , y2] = resolveToken(design.set, token as Token & { type: "cubicBezier" });
      for (const y of [y1, y2]) {
        expect(y, token.path.join(".")).toBeGreaterThanOrEqual(0);
        expect(y, token.path.join(".")).toBeLessThanOrEqual(1);
      }
    }
  });

  it("space on a 4 px grid, each named by its multiple of 4 px", () => {
    const spaces = byPath("space.");
    expect(spaces.length).toBeGreaterThan(0);
    for (const token of spaces) {
      const { px } = resolveToken(design.set, token as Token & { type: "dimension" });
      expect(px, token.path.join(".")).toBe(Number(token.path[1]) * 4);
    }
  });

  it("keep text at 12 px or more, and no heavier than 600", () => {
    for (const token of byPath("type.")) {
      const typography = resolveToken(design.set, token as Token & { type: "typography" });
      expect(typography.fontSize.px, token.path.join(".")).toBeGreaterThanOrEqual(12);
      expect(typography.fontWeight, token.path.join(".")).toBeLessThanOrEqual(600);
    }
  });
});

describe("generated files", () => {
  it("cover every output", () => {
    expect(generate(json).map((output) => output.path)).toEqual(Object.values(OUTPUTS));
  });

  it("give script the same values as the source", () => {
    expect(themes.light.color.surface.app).toBe("#fbfaf7");
    expect(themes.dark.color.bubble.character).toBe(themes.dark.color.accent.soft);
    expect(tokens.motion.duration.fast).toBe(150);
    expect(tokens.type.body.fontSize).toBe(tokens.font.size.lg);
  });
});
