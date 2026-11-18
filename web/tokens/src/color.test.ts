import { describe, expect, it } from "vitest";
import {
  compositeOver,
  contrastRatio,
  hexToRgb,
  hueDistance,
  inSrgbGamut,
  oklchToRgb,
  rgbToHex,
  rgbToOklch,
} from "./color.ts";

describe("hex conversion", () => {
  it("round-trips six-digit hex, lowercased", () => {
    expect(rgbToHex(hexToRgb("#07618F"))).toBe("#07618f");
    expect(hexToRgb("#ff0080")).toEqual({ r: 1, g: 0, b: 128 / 255 });
  });

  it.each(["#fff", "07618f", "#07618g", "#07618f80"])("rejects %s", (hex) => {
    expect(() => hexToRgb(hex)).toThrow(/six-digit/);
  });
});

describe("contrastRatio", () => {
  it("gives 21 for black on white and 1 for a color on itself", () => {
    expect(contrastRatio(hexToRgb("#000000"), hexToRgb("#ffffff"))).toBeCloseTo(21, 6);
    expect(contrastRatio(hexToRgb("#07618f"), hexToRgb("#07618f"))).toBe(1);
  });

  it("does not depend on the order of its arguments", () => {
    const a = hexToRgb("#5b5650");
    const b = hexToRgb("#fbfaf7");
    expect(contrastRatio(a, b)).toBe(contrastRatio(b, a));
  });

  it("matches the WCAG reference value for #767676 on white (4.54:1)", () => {
    expect(contrastRatio(hexToRgb("#767676"), hexToRgb("#ffffff"))).toBeCloseTo(4.54, 2);
  });
});

describe("compositeOver", () => {
  it("mixes a translucent color over an opaque one", () => {
    const mixed = compositeOver(hexToRgb("#000000"), 0.25, hexToRgb("#ffffff"));
    expect(rgbToHex(mixed)).toBe("#bfbfbf");
  });

  it("returns the background at alpha 0 and the foreground at alpha 1", () => {
    const front = hexToRgb("#07618f");
    const back = hexToRgb("#fbfaf7");
    expect(compositeOver(front, 0, back)).toEqual(back);
    expect(compositeOver(front, 1, back)).toEqual(front);
  });
});

describe("OKLCH", () => {
  it("matches the reference values for sRGB red and white", () => {
    // Reference: CSS Color 4 sample code, oklch(62.8% 0.2577 29.23) for red.
    const red = rgbToOklch(hexToRgb("#ff0000"));
    expect(red.l).toBeCloseTo(0.628, 3);
    expect(red.c).toBeCloseTo(0.2577, 3);
    expect(red.h).toBeCloseTo(29.23, 1);
    const white = rgbToOklch(hexToRgb("#ffffff"));
    expect(white.l).toBeCloseTo(1, 4);
    expect(white.c).toBeCloseTo(0, 4);
  });

  it("round-trips through sRGB", () => {
    for (const hex of ["#07618f", "#d06c00", "#c22630", "#fbfaf7", "#211d1a"]) {
      expect(rgbToHex(oklchToRgb(rgbToOklch(hexToRgb(hex))))).toBe(hex);
    }
  });

  it("reports colors outside the sRGB gamut instead of clamping them", () => {
    const vivid = oklchToRgb({ l: 0.7, c: 0.35, h: 150 });
    expect(inSrgbGamut(vivid)).toBe(false);
    expect(inSrgbGamut(oklchToRgb({ l: 0.7, c: 0.05, h: 150 }))).toBe(true);
  });
});

describe("hueDistance", () => {
  it.each([
    [10, 50, 40],
    [350, 10, 20],
    [0, 180, 180],
    [270, 90, 180],
    [-30, 30, 60],
  ])("between %d and %d is %d", (a, b, expected) => {
    expect(hueDistance(a, b)).toBe(expected);
  });
});
