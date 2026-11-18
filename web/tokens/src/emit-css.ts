/**
 * Writes the design tokens as CSS custom properties for the web code: the
 * desktop windows, `web/stage`, and the gateway's two sites.
 *
 * Global tokens and the light theme go on `:root`. The dark theme applies
 * when the system prefers dark and the page has not chosen light, or when
 * the page sets `data-theme="dark"` on its root element:
 *
 *     <html>                     follows the system
 *     <html data-theme="light">  always light
 *     <html data-theme="dark">   always dark
 *
 * An alias of another emitted token stays an alias, as `var(--nl-...)`, so
 * that overriding one property on the root element at run time (the
 * character pack's accent) carries through to every token built on it.
 * Overriding it on a descendant does not: a custom property resolves its
 * `var()` where it is declared, and descendants inherit the result. Aliases
 * of primitives are written out as values, because primitives are not
 * emitted.
 *
 * With reduced motion on, every duration becomes 0 ms: the interface stops
 * animating (UI design note, section 3). Code must therefore not wait for a
 * `transitionend` event, which a zero-length transition never fires.
 */

import {
  resolvePart,
  type Color,
  type Dimension,
  type Duration,
  type CubicBezier,
  type Part,
  type ShadowLayer,
  type Token,
  type Typography,
} from "./dtcg.ts";
import { THEMES, cssName, isEmitted, type Design } from "./model.ts";
import { toByte } from "./color.ts";

export const GENERATED_NOTICE =
  "Generated from design/tokens.json by web/tokens during the build, and never committed. Edit design/tokens.json instead.";

/** Formats a number without floating-point noise such as 0.30000000000000004. */
export function formatNumber(value: number): string {
  return String(Number(value.toFixed(6)));
}

/** A color as CSS: `#rrggbb` when opaque, `rgb(r g b / alpha)` otherwise. */
export function cssColor(color: Color): string {
  if (color.alpha === 1) return color.hex;
  return `rgb(${toByte(color.r)} ${toByte(color.g)} ${toByte(color.b)} / ${formatNumber(color.alpha)})`;
}

export function cssDimension(dimension: Dimension): string {
  return `${formatNumber(dimension.px)}px`;
}

/** Generic families and system-font keywords, which CSS needs unquoted. */
const UNQUOTED_FAMILIES: ReadonlySet<string> = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "emoji",
  "math",
  "fangsong",
  "-apple-system",
  "BlinkMacSystemFont",
]);

/** A font stack as CSS: family names quoted, generic families and system keywords bare. */
export function cssFontFamily(families: readonly string[]): string {
  return families
    .map((family) => (UNQUOTED_FAMILIES.has(family) ? family : `"${family.replace(/["\\]/g, "\\$&")}"`))
    .join(", ");
}

export function cssCubicBezier(curve: CubicBezier): string {
  return `cubic-bezier(${curve.map(formatNumber).join(", ")})`;
}

/** Formats one part of a value: an alias of an emitted token stays a `var()`. */
function cssPart<T>(design: Design, part: Part<T>, format: (value: T) => string): string {
  if ("alias" in part && isEmitted(part.alias)) return `var(${cssName(part.alias)})`;
  return format(resolvePart(design.set, part));
}

function cssShadow(design: Design, layers: readonly ShadowLayer[]): string {
  return layers
    .map((layer) =>
      [
        ...(layer.inset ? ["inset"] : []),
        cssPart(design, layer.offsetX, cssDimension),
        cssPart(design, layer.offsetY, cssDimension),
        cssPart(design, layer.blur, cssDimension),
        cssPart(design, layer.spread, cssDimension),
        cssPart(design, layer.color, cssColor),
      ].join(" "),
    )
    .join(", ");
}

/** The CSS declarations for one token: one for most types, five for typography. */
function declarations(design: Design, token: Token): Array<[string, string]> {
  const name = cssName(token.path);
  const { value } = token;
  if ("alias" in value && isEmitted(value.alias) && token.type !== "typography") {
    return [[name, `var(${cssName(value.alias)})`]];
  }
  switch (token.type) {
    case "color":
      return [[name, cssPart(design, value as Part<Color>, cssColor)]];
    case "dimension":
      return [[name, cssPart(design, value as Part<Dimension>, cssDimension)]];
    case "fontFamily":
      return [[name, cssPart(design, value as Part<readonly string[]>, cssFontFamily)]];
    case "fontWeight":
    case "number":
      return [[name, cssPart(design, value as Part<number>, formatNumber)]];
    case "duration":
      return [[name, cssPart(design, value as Part<Duration>, (duration) => `${formatNumber(duration.ms)}ms`)]];
    case "cubicBezier":
      return [[name, cssPart(design, value as Part<CubicBezier>, cssCubicBezier)]];
    case "shadow":
      return [[name, cssShadow(design, resolvePart(design.set, value as Part<readonly ShadowLayer[]>))]];
    case "typography": {
      // A typography token becomes one property per part, because CSS has no
      // single property for all five (the `font` shorthand lacks letter
      // spacing). An alias of a whole typography token is spelled out too.
      const typography = resolvePart(design.set, value as Part<Typography>);
      return [
        [`${name}-font-family`, cssPart(design, typography.fontFamily, cssFontFamily)],
        [`${name}-font-size`, cssPart(design, typography.fontSize, cssDimension)],
        [`${name}-font-weight`, cssPart(design, typography.fontWeight, formatNumber)],
        [`${name}-letter-spacing`, cssPart(design, typography.letterSpacing, cssDimension)],
        [`${name}-line-height`, cssPart(design, typography.lineHeight, formatNumber)],
      ];
    }
  }
}

/** One token's lines inside a block, optionally preceded by its description. */
function tokenLines(design: Design, token: Token, indent: string, withDescription: boolean): string[] {
  const lines: string[] = [];
  if (withDescription && token.description) lines.push(`${indent}/* ${token.description.replace(/\*\//g, "* /")} */`);
  for (const [property, value] of declarations(design, token)) lines.push(`${indent}${property}: ${value};`);
  return lines;
}

export function emitCss(design: Design): string {
  const [light, dark] = THEMES;
  const darkLines = (indent: string) => [
    `${indent}color-scheme: dark;`,
    ...design.themes[dark].flatMap((token) => tokenLines(design, token, indent, false)),
  ];
  const durations = design.global.filter((token) => token.type === "duration");

  const blocks = [
    `/*\n * ${GENERATED_NOTICE}\n */`,
    [
      ":root {",
      ...design.global.flatMap((token) => tokenLines(design, token, "  ", true)),
      "",
      `  /* The ${light} theme, the default. */`,
      `  color-scheme: ${light};`,
      ...design.themes[light].flatMap((token) => tokenLines(design, token, "  ", true)),
      "}",
    ].join("\n"),
    [
      `/* The ${dark} theme, when the system prefers it and the page has not chosen ${light}. */`,
      "@media (prefers-color-scheme: dark) {",
      `  :root:not([data-theme="${light}"]) {`,
      ...darkLines("    "),
      "  }",
      "}",
    ].join("\n"),
    [`/* The ${dark} theme, when the page chooses it. */`, `:root[data-theme="${dark}"] {`, ...darkLines("  "), "}"].join(
      "\n",
    ),
  ];
  if (durations.length > 0) {
    blocks.push(
      [
        "/* Reduced motion: the interface stops animating. */",
        "@media (prefers-reduced-motion: reduce) {",
        "  :root {",
        ...durations.map((token) => `    ${cssName(token.path)}: 0ms;`),
        "  }",
        "}",
      ].join("\n"),
    );
  }
  return `${blocks.join("\n\n")}\n`;
}

/** Every emitted token's CSS property name, for tests and tools. */
export function cssProperties(design: Design): string[] {
  return [...design.global, ...design.themes.light].flatMap((token) =>
    declarations(design, token).map(([property]) => property),
  );
}
