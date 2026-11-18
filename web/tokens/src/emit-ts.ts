/**
 * Writes the design tokens as TypeScript constants, for web code that needs
 * values rather than CSS properties: drawing on a canvas, timing an
 * animation in script, or matching a breakpoint with `matchMedia`.
 *
 * Styles should use the CSS properties instead (`tokens.css`), which follow
 * the theme and reduced motion by themselves.
 *
 * Values: colors and shadows are CSS strings, dimensions are CSS pixels,
 * durations are milliseconds, font stacks are CSS `font-family` strings,
 * and curves are the four numbers of a cubic Bézier.
 */

import { resolveToken, type Resolved, type Token, type TokenType } from "./dtcg.ts";
import { THEMES, relativePath, type Design } from "./model.ts";
import { GENERATED_NOTICE, cssColor, cssDimension, cssFontFamily, formatNumber } from "./emit-css.ts";

/** A token's place in the generated object: the token and its value as code. */
interface Leaf {
  token: Token;
  code: string;
}

/** A nested object literal under construction, in file order. */
type Tree = Map<string, Tree | Leaf>;

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function key(name: string): string {
  return IDENTIFIER.test(name) ? name : JSON.stringify(name);
}

/** A string literal; single-quoted when that avoids escaping the double quotes of CSS font names. */
function str(value: string): string {
  if (value.includes('"') && !value.includes("'")) return `'${value.replaceAll("\\", "\\\\")}'`;
  return JSON.stringify(value);
}

function tsValue(design: Design, token: Token): string {
  const value = resolveToken(design.set, token);
  switch (token.type as TokenType) {
    case "color":
      return str(cssColor(value as Resolved<"color">));
    case "dimension":
      return formatNumber((value as Resolved<"dimension">).px);
    case "fontFamily":
      return str(cssFontFamily(value as Resolved<"fontFamily">));
    case "fontWeight":
    case "number":
      return formatNumber(value as number);
    case "duration":
      return formatNumber((value as Resolved<"duration">).ms);
    case "cubicBezier":
      return `[${(value as Resolved<"cubicBezier">).map(formatNumber).join(", ")}]`;
    case "shadow":
      return str(
        (value as Resolved<"shadow">)
          .map((layer) =>
            [
              ...(layer.inset ? ["inset"] : []),
              cssDimension(layer.offsetX),
              cssDimension(layer.offsetY),
              cssDimension(layer.blur),
              cssDimension(layer.spread),
              cssColor(layer.color),
            ].join(" "),
          )
          .join(", "),
      );
    case "typography": {
      const typography = value as Resolved<"typography">;
      return `{ fontFamily: ${str(cssFontFamily(typography.fontFamily))}, fontSize: ${formatNumber(
        typography.fontSize.px,
      )}, fontWeight: ${formatNumber(typography.fontWeight)}, letterSpacing: ${formatNumber(
        typography.letterSpacing.px,
      )}, lineHeight: ${formatNumber(typography.lineHeight)} }`;
    }
  }
}

function buildTree(design: Design, tokens: readonly Token[]): Tree {
  const root: Tree = new Map();
  for (const token of tokens) {
    const path = relativePath(token.path);
    let node = root;
    for (const segment of path.slice(0, -1)) {
      let child = node.get(segment);
      if (child === undefined) {
        child = new Map();
        node.set(segment, child);
      }
      // A token cannot also be a group (the reader rejects that), so every
      // inner segment names a group.
      node = child as Tree;
    }
    node.set(path[path.length - 1]!, { token, code: tsValue(design, token) });
  }
  return root;
}

function render(tree: Tree, indent: string, withDescriptions: boolean): string[] {
  const lines: string[] = [];
  for (const [name, entry] of tree) {
    if (entry instanceof Map) {
      lines.push(`${indent}${key(name)}: {`, ...render(entry, `${indent}  `, withDescriptions), `${indent}},`);
      continue;
    }
    const { token, code } = entry;
    if (withDescriptions && token.description) lines.push(`${indent}/** ${token.description.replace(/\*\//g, "* /")} */`);
    lines.push(`${indent}${key(name)}: ${code},`);
  }
  return lines;
}

export function emitTs(design: Design): string {
  const [first] = THEMES;
  return [
    `// ${GENERATED_NOTICE}`,
    "",
    "/**",
    " * Tokens that are the same in every theme. Colors and shadows are CSS",
    " * strings, dimensions CSS pixels, durations milliseconds.",
    " */",
    "export const tokens = {",
    ...render(buildTree(design, design.global), "  ", true),
    "} as const;",
    "",
    "/** The tokens of each theme. Every theme has the same keys. */",
    "export const themes = {",
    ...THEMES.flatMap((theme) => [
      `  ${theme}: {`,
      ...render(buildTree(design, design.themes[theme]), "    ", theme === first),
      "  },",
    ]),
    "} as const;",
    "",
    "export type ThemeName = keyof typeof themes;",
    "",
  ].join("\n");
}
