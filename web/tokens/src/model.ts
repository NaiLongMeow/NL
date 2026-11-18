/**
 * NL's conventions on top of the token format: which tokens are primitives,
 * which belong to a theme, and how a token's path becomes a name in each
 * generated language.
 *
 * - `palette` holds primitive colors. Other tokens alias them; the generator
 *   never emits them, so screens can only reach semantic tokens.
 * - `light` and `dark` hold the same semantic tokens with each theme's
 *   values. Light is the default; dark applies when the system asks for it
 *   or the user chooses it.
 * - Every other top-level group is the same in both themes.
 *
 * Inside a theme, a token's path drops the theme's name, so
 * `light.color.surface.app` and `dark.color.surface.app` are both
 * `--nl-color-surface-app` in CSS and `colorSurfaceApp` in Dart.
 */

import {
  TokenError,
  dotted,
  type Part,
  type Path,
  type ShadowLayer,
  type Token,
  type TokenSet,
  type Typography,
} from "./dtcg.ts";

export const PRIMITIVES = "palette";
export const THEMES = ["light", "dark"] as const;
export type ThemeName = (typeof THEMES)[number];

/** Where a token applies. */
export type Scope = { kind: "primitive" } | { kind: "global" } | { kind: "theme"; theme: ThemeName };

/** The tokens of a design, split by where they apply. */
export interface Design {
  set: TokenSet;
  /** Tokens that are the same in every theme, in file order. */
  global: readonly Token[];
  /**
   * Each theme's tokens. Every theme lists the same relative paths, with the
   * same types, in the order of the first theme.
   */
  themes: Readonly<Record<ThemeName, readonly Token[]>>;
}

function isTheme(name: string | undefined): name is ThemeName {
  return (THEMES as readonly string[]).includes(name ?? "");
}

export function scopeOf(path: Path): Scope {
  const [top] = path;
  if (top === PRIMITIVES) return { kind: "primitive" };
  if (isTheme(top)) return { kind: "theme", theme: top };
  return { kind: "global" };
}

/** A token's path without its theme, the path every output names it by. */
export function relativePath(path: Path): Path {
  return scopeOf(path).kind === "theme" ? path.slice(1) : path;
}

/** The CSS custom property for a token: `--nl-` and its relative path joined by hyphens. */
export function cssName(path: Path): string {
  return `--nl-${relativePath(path).join("-")}`;
}

/** The Dart identifier for a token: its relative path in lower camel case. */
export function dartName(path: Path): string {
  const words = relativePath(path).flatMap((segment) => segment.split("-"));
  return words.map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))).join("");
}

/** Whether the generator writes a token out (everything but primitives). */
export function isEmitted(path: Path): boolean {
  return scopeOf(path).kind !== "primitive";
}

/** Every alias a token makes: its whole value, or the parts of a composite value. */
export function aliasesOf(token: Token): Path[] {
  const { value } = token;
  if ("alias" in value) return [value.alias];
  const parts: Array<Part<unknown>> = [];
  if (token.type === "shadow") {
    for (const layer of value.literal as readonly ShadowLayer[]) {
      parts.push(layer.color, layer.offsetX, layer.offsetY, layer.blur, layer.spread);
    }
  } else if (token.type === "typography") {
    const typography = value.literal as Typography;
    parts.push(typography.fontFamily, typography.fontSize, typography.fontWeight, typography.letterSpacing, typography.lineHeight);
  }
  return parts.flatMap((part) => ("alias" in part ? [part.alias] : []));
}

const DART_IDENTIFIER = /^[a-z][A-Za-z0-9]*$/;
/** Reserved words and built-in identifiers that cannot name a Dart field. */
const DART_RESERVED: ReadonlySet<string> = new Set([
  "abstract", "as", "assert", "async", "await", "base", "break", "case", "catch", "class", "const", "continue",
  "covariant", "default", "deferred", "do", "dynamic", "else", "enum", "export", "extends", "extension",
  "external", "factory", "false", "final", "finally", "for", "function", "get", "hide", "if", "implements",
  "import", "in", "interface", "is", "late", "library", "mixin", "new", "null", "of", "on", "operator", "part",
  "required", "rethrow", "return", "sealed", "set", "show", "static", "super", "switch", "sync", "this",
  "throw", "true", "try", "type", "typedef", "var", "void", "when", "while", "with", "yield",
]);

/**
 * Splits a parsed token set by scope and checks NL's rules:
 *
 * - both themes exist and hold the same tokens with the same types;
 * - aliases stay in scope: a primitive aliases only primitives, a global
 *   token only primitives and globals, and a theme token only primitives,
 *   globals, and tokens of its own theme;
 * - no two emitted tokens get the same CSS or Dart name.
 */
export function buildDesign(set: TokenSet): Design {
  const problems: string[] = [];
  const global: Token[] = [];
  const byTheme: Record<ThemeName, Token[]> = { light: [], dark: [] };

  for (const token of set.tokens.values()) {
    const scope = scopeOf(token.path);
    if (scope.kind === "global") global.push(token);
    if (scope.kind === "theme") byTheme[scope.theme].push(token);

    for (const alias of aliasesOf(token)) {
      const target = scopeOf(alias);
      const allowed =
        target.kind === "primitive" ||
        (target.kind === "global" && scope.kind !== "primitive") ||
        (target.kind === "theme" && scope.kind === "theme" && target.theme === scope.theme);
      if (!allowed) {
        const where = scope.kind === "theme" ? `a ${scope.theme} token` : `a ${scope.kind} token`;
        problems.push(`${dotted(token.path)}: ${where} cannot alias {${dotted(alias)}}`);
      }
    }
  }

  const [first, ...others] = THEMES;
  if (byTheme[first].length === 0) problems.push(`the ${first} theme has no tokens`);
  const reference = new Map(byTheme[first].map((token) => [dotted(relativePath(token.path)), token]));
  const themes = { [first]: byTheme[first] } as Record<ThemeName, Token[]>;
  for (const theme of others) {
    const tokens = new Map(byTheme[theme].map((token) => [dotted(relativePath(token.path)), token]));
    for (const [key, token] of reference) {
      const other = tokens.get(key);
      if (!other) problems.push(`${theme}.${key}: missing; every theme needs the tokens of ${first}`);
      else if (other.type !== token.type) {
        problems.push(`${theme}.${key}: is a ${other.type} token, but ${first}.${key} is a ${token.type}`);
      }
    }
    for (const key of tokens.keys()) {
      if (!reference.has(key)) problems.push(`${theme}.${key}: not in ${first}; every theme holds the same tokens`);
    }
    // Emit every theme in the first theme's order, so that the generated
    // blocks line up when compared side by side.
    themes[theme] = [...reference.keys()].flatMap((key) => tokens.get(key) ?? []);
  }

  const emitted = [...global, ...byTheme[first]];
  for (const [kind, name] of [
    ["CSS", cssName],
    ["Dart", dartName],
  ] as const) {
    const seen = new Map<string, Token>();
    for (const token of emitted) {
      const generated = name(token.path);
      const earlier = seen.get(generated);
      if (earlier) problems.push(`${dotted(token.path)}: its ${kind} name ${generated} is also ${dotted(earlier.path)}'s`);
      seen.set(generated, token);
      if (kind === "Dart" && (!DART_IDENTIFIER.test(generated) || DART_RESERVED.has(generated))) {
        problems.push(`${dotted(token.path)}: ${generated} is not a usable Dart identifier`);
      }
    }
  }

  if (problems.length > 0) throw new TokenError(problems);
  return { set, global, themes };
}
