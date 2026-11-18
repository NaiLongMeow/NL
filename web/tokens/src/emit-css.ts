/**
 * Writes the design tokens as CSS custom properties for the web code: the
 * desktop windows, `web/stage`, and the gateway's two sites.
 *
 * Global tokens and the default theme's light mode apply to the root. Two
 * attributes choose the rest, on the root or on any element (UI design
 * note, section 11):
 *
 *     <html>                                  default theme, system's mode
 *     <html data-mode="dark">                 default theme, dark
 *     <html data-theme="sakura">              sakura, system's mode
 *     <div data-theme="matcha" data-mode="light">  a matcha preview
 *
 * Without `data-mode` an element follows the system's preference. The mode
 * does not inherit from an ancestor's attribute, so an element that sets
 * `data-theme` should set `data-mode` too.
 *
 * Every rule is wrapped in `:where()`, which gives it zero specificity, so
 * the rules only compete by their order here, and a custom theme loaded
 * after this file overrides any token with ordinary selectors (`:root`,
 * `:root[data-mode="dark"]`).
 *
 * An alias of another emitted token stays an alias, as `var(--nl-...)`, so
 * that overriding one property carries through to every token built on it.
 * A custom property resolves its `var()` on the element that declares it,
 * and every theme rule declares all theme tokens, so an alias inside a
 * preview resolves to the preview's own values. Aliases of primitives are
 * written out as values, because primitives are not emitted.
 *
 * With reduced motion on, every duration becomes 0 ms: the interface stops
 * animating (UI design note, section 3). Those declarations are the only
 * `!important` ones, so that no theme can turn animation back on. Code must
 * therefore not wait for a `transitionend` event, which a zero-length
 * transition never fires.
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
import { MODES, cssName, defaultTheme, isEmitted, type Design, type Mode } from "./model.ts";
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

/** The selectors of one theme and mode, each wrapped in `:where()` (see the module comment). */
function selectors(design: Design, theme: string, mode: Mode, system: boolean): string {
  const isDefault = theme === defaultTheme(design);
  const own = `[data-theme="${theme}"]`;
  const forMode = system ? ":not([data-mode])" : mode === "light" ? "" : `[data-mode="${mode}"]`;
  const list = [...(isDefault ? [`:root${forMode}`] : []), `${own}${forMode}`];
  return list.map((selector) => `:where(${selector})`).join(", ");
}

export function emitCss(design: Design): string {
  const [light] = MODES;
  const reference = defaultTheme(design);
  const durations = design.global.filter((token) => token.type === "duration");
  const themeLines = (theme: string, mode: Mode, indent: string) => [
    `${indent}color-scheme: ${mode};`,
    ...design.themes.get(theme)![mode].flatMap((token) =>
      tokenLines(design, token, indent, theme === reference && mode === light),
    ),
  ];
  const block = (lines: string[]) => lines.join("\n");

  const blocks = [
    `/*\n * ${GENERATED_NOTICE}\n */`,
    block([":where(:root) {", ...design.global.flatMap((token) => tokenLines(design, token, "  ", true)), "}"]),
  ];
  for (const theme of design.themes.keys()) {
    const label = theme === reference ? `The ${theme} theme, the default` : `The ${theme} theme`;
    blocks.push(block([`/* ${label}: ${light}. */`, `${selectors(design, theme, light, false)} {`, ...themeLines(theme, light, "  "), "}"]));
    for (const mode of MODES.filter((other) => other !== light)) {
      blocks.push(
        block([
          `/* ${label}: ${mode}, when the system prefers it and no mode is chosen. */`,
          `@media (prefers-color-scheme: ${mode}) {`,
          `  ${selectors(design, theme, mode, true)} {`,
          ...themeLines(theme, mode, "    "),
          "  }",
          "}",
        ]),
        block([`/* ${label}: ${mode}, when it is chosen. */`, `${selectors(design, theme, mode, false)} {`, ...themeLines(theme, mode, "  "), "}"]),
      );
    }
  }
  if (durations.length > 0) {
    blocks.push(
      block([
        "/* Reduced motion: the interface stops animating, whatever a theme says. */",
        "@media (prefers-reduced-motion: reduce) {",
        "  :root {",
        ...durations.map((token) => `    ${cssName(token.path)}: 0ms !important;`),
        "  }",
        "}",
      ]),
    );
  }
  return `${blocks.join("\n\n")}\n`;
}

/** Every emitted token's CSS property name, for tests and tools. */
export function cssProperties(design: Design): string[] {
  return [...design.global, ...design.themes.get(defaultTheme(design))!.light].flatMap((token) =>
    declarations(design, token).map(([property]) => property),
  );
}
