/**
 * Color math for NL's design tokens: sRGB hex conversion, WCAG contrast, and
 * OKLCH.
 *
 * The token generator uses it to check that a color's `hex` fallback matches
 * its components, and the token tests use it to hold the palette to its
 * accessibility rules (contrast) and to keep every other hue away from the
 * reserved "microphone on" orange (hue distance in OKLCH). The runtime check
 * of a character pack's accent will reuse the same functions, so a pack is
 * judged by the rules the built-in palette passes.
 *
 * All channels are numbers from 0 to 1 in gamma-encoded sRGB unless a name
 * says otherwise. Nothing here clamps silently: callers that may leave the
 * sRGB gamut (OKLCH input) can test for it with `inSrgbGamut`.
 */

/** A gamma-encoded sRGB color, each channel from 0 to 1. */
export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** A color in OKLCH: lightness 0 to 1, chroma from 0, hue in degrees 0 to 360. */
export interface Oklch {
  l: number;
  c: number;
  h: number;
}

const HEX = /^#([0-9a-f]{6})$/i;

/** Parses six-digit CSS hex notation (`#rrggbb`), the only form tokens use. */
export function hexToRgb(hex: string): Rgb {
  const match = HEX.exec(hex);
  if (!match?.[1]) throw new Error(`not a six-digit hex color: ${hex}`);
  const value = Number.parseInt(match[1], 16);
  return {
    r: ((value >> 16) & 0xff) / 255,
    g: ((value >> 8) & 0xff) / 255,
    b: (value & 0xff) / 255,
  };
}

/** Formats a color as lowercase `#rrggbb`, rounding each channel to 8 bits. */
export function rgbToHex(rgb: Rgb): string {
  return `#${[rgb.r, rgb.g, rgb.b].map((channel) => toByte(channel).toString(16).padStart(2, "0")).join("")}`;
}

/** Converts a channel from 0..1 to the nearest 8-bit value, clamped to 0..255. */
export function toByte(channel: number): number {
  return Math.min(255, Math.max(0, Math.round(channel * 255)));
}

/** sRGB transfer function: gamma-encoded channel to linear light. */
function toLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

/** Inverse sRGB transfer function: linear light to gamma-encoded channel. */
function fromLinear(channel: number): number {
  return channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;
}

/**
 * Relative luminance as defined by WCAG 2.2. WCAG's text still quotes the
 * older 0.03928 threshold; 0.04045 is the sRGB standard's value, and the two
 * give the same result for every 8-bit color.
 */
export function relativeLuminance(rgb: Rgb): number {
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
}

/** WCAG 2.2 contrast ratio between two opaque colors, from 1 to 21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * The opaque color seen when `foreground` with `alpha` is drawn over the
 * opaque `background`. Contrast is only defined between opaque colors, so a
 * translucent token is checked through this.
 */
export function compositeOver(foreground: Rgb, alpha: number, background: Rgb): Rgb {
  const mix = (front: number, back: number) => front * alpha + back * (1 - alpha);
  return { r: mix(foreground.r, background.r), g: mix(foreground.g, background.g), b: mix(foreground.b, background.b) };
}

/** Converts sRGB to OKLCH (Björn Ottosson's OKLab, in polar form). */
export function rgbToOklch(rgb: Rgb): Oklch {
  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const hue = (Math.atan2(bb, a) * 180) / Math.PI;
  return { l: lightness, c: Math.hypot(a, bb), h: hue < 0 ? hue + 360 : hue };
}

/**
 * Converts OKLCH to sRGB without clamping, so a color outside the sRGB gamut
 * comes back with channels below 0 or above 1 (see `inSrgbGamut`).
 */
export function oklchToRgb(oklch: Oklch): Rgb {
  const hue = (oklch.h * Math.PI) / 180;
  const a = oklch.c * Math.cos(hue);
  const bb = oklch.c * Math.sin(hue);
  const l = (oklch.l + 0.3963377774 * a + 0.2158037573 * bb) ** 3;
  const m = (oklch.l - 0.1055613458 * a - 0.0638541728 * bb) ** 3;
  const s = (oklch.l - 0.0894841775 * a - 1.291485548 * bb) ** 3;
  return {
    r: fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

/** Whether every channel lies in 0..1, allowing for floating-point error. */
export function inSrgbGamut(rgb: Rgb, tolerance = 1e-6): boolean {
  return [rgb.r, rgb.g, rgb.b].every((channel) => channel >= -tolerance && channel <= 1 + tolerance);
}

/** The shorter angle between two hues, in degrees, from 0 to 180. */
export function hueDistance(a: number, b: number): number {
  const difference = Math.abs((((a - b) % 360) + 360) % 360);
  return Math.min(difference, 360 - difference);
}
