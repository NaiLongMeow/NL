/**
 * NL's conventions on top of the token format: which tokens are primitives,
 * which belong to a theme, and how a token's path becomes a name in each
 * generated language.
 *
 * - `palette` holds primitive values: colors, and the shadows each mode
 *   uses. Other tokens alias them; the generator never emits them, so
 *   screens can only reach semantic tokens.
 * - `theme` holds the color themes the user chooses from (UI design note,
 *   section 3). Each theme has a light and a dark mode, `theme.<name>.light`
 *   and `theme.<name>.dark`, and every theme and mode holds the same
 *   semantic tokens with its own values. The first theme is the default.
 * - Every other top-level group is the same in every theme and mode.
 *
 * Inside a theme, a token's path drops the theme and the mode, so
 * `theme.sea.light.color.surface.app` and `theme.sakura.dark.color.surface.app`
 * are both `--nl-color-surface-app` in CSS and `colorSurfaceApp` in Dart.
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
export const THEMES = "theme";
export const MODES = ["light", "dark"] as const;
export type Mode = (typeof MODES)[number];

/** Where a token applies. */
export type Scope =
  | { kind: "primitive" }
  | { kind: "global" }
  | { kind: "theme"; theme: string; mode: Mode }
  /** Under `theme` but not at `theme.<name>.<mode>.…`; buildDesign rejects it. */
  | { kind: "misplaced" };

/** One theme's tokens in each mode. */
export type ThemeTokens = Readonly<Record<Mode, readonly Token[]>>;

/** The tokens of a design, split by where they apply. */
export interface Design {
  set: TokenSet;
  /** Tokens that are the same in every theme and mode, in file order. */
  global: readonly Token[];
  /**
   * Each theme's tokens, by theme name in file order; the first theme is the
   * default. Every theme and mode lists the same relative paths, with the
   * same types, in the order of the first theme's light mode.
   */
  themes: ReadonlyMap<string, ThemeTokens>;
}

function isMode(name: string | undefined): name is Mode {
  return (MODES as readonly string[]).includes(name ?? "");
}

export function scopeOf(path: Path): Scope {
  const [top, theme, mode] = path;
  if (top === PRIMITIVES) return { kind: "primitive" };
  if (top !== THEMES) return { kind: "global" };
  if (theme === undefined || !isMode(mode) || path.length < 4) return { kind: "misplaced" };
  return { kind: "theme", theme, mode };
}

/** A token's path without its theme and mode, the path every output names it by. */
export function relativePath(path: Path): Path {
  return scopeOf(path).kind === "theme" ? path.slice(3) : path;
}

/** Lower camel case of hyphenated words: `on-fill` → `onFill`, `["color", "on-fill"]` → `colorOnFill`. */
export function camelCase(segments: readonly string[]): string {
  const words = segments.flatMap((segment) => segment.split("-"));
  return words.map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))).join("");
}

/** The CSS custom property for a token: `--nl-` and its relative path joined by hyphens. */
export function cssName(path: Path): string {
  return `--nl-${relativePath(path).join("-")}`;
}

/** The Dart identifier for a token: its relative path in lower camel case. */
export function dartName(path: Path): string {
  return camelCase(relativePath(path));
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

/**
 * The reader already requires lowercase kebab case for every name. A theme
 * name must also start with a letter, because in camel case it names a
 * constant in Dart.
 */
const THEME_NAME = /^[a-z]/;
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
/** Names the Dart output already uses inside `NlTokens`, besides the tokens. */
const DART_TAKEN: ReadonlySet<string> = new Set(["themes"]);

function describeScope(scope: Scope): string {
  switch (scope.kind) {
    case "theme":
      return `a ${scope.theme} ${scope.mode} token`;
    case "misplaced":
      return "a misplaced token";
    default:
      return `a ${scope.kind} token`;
  }
}

/**
 * Splits a parsed token set by scope and checks NL's rules:
 *
 * - every token under `theme` sits at `theme.<name>.<light|dark>.…`, and
 *   theme names start with a letter;
 * - at least one theme exists, and every theme and mode holds the same
 *   tokens with the same types as the first theme's light mode;
 * - aliases stay in scope: a primitive aliases only primitives, a global
 *   token only primitives and globals, and a theme token only primitives,
 *   globals, and tokens of its own theme and mode;
 * - no two emitted tokens get the same CSS or Dart name, and no theme gets
 *   a Dart name that a token or the generated code already uses.
 */
export function buildDesign(set: TokenSet): Design {
  const problems: string[] = [];
  const global: Token[] = [];
  const byTheme = new Map<string, Record<Mode, Token[]>>();

  for (const token of set.tokens.values()) {
    const scope = scopeOf(token.path);
    if (scope.kind === "global") global.push(token);
    if (scope.kind === "misplaced") {
      problems.push(`${dotted(token.path)}: a theme token must sit at ${THEMES}.<name>.<${MODES.join("|")}>.<group>.…`);
    }
    if (scope.kind === "theme") {
      let modes = byTheme.get(scope.theme);
      if (!modes) {
        if (!THEME_NAME.test(scope.theme)) {
          problems.push(`${THEMES}.${scope.theme}: a theme name must start with a letter`);
        }
        modes = { light: [], dark: [] };
        byTheme.set(scope.theme, modes);
      }
      modes[scope.mode].push(token);
    }

    for (const alias of aliasesOf(token)) {
      const target = scopeOf(alias);
      const allowed =
        target.kind === "primitive" ||
        (target.kind === "global" && scope.kind !== "primitive") ||
        (target.kind === "theme" &&
          scope.kind === "theme" &&
          target.theme === scope.theme &&
          target.mode === scope.mode);
      if (!allowed) problems.push(`${dotted(token.path)}: ${describeScope(scope)} cannot alias {${dotted(alias)}}`);
    }
  }

  const themes = new Map<string, ThemeTokens>();
  const [first] = byTheme.keys();
  if (first === undefined) {
    problems.push(`no themes: the ${THEMES} group needs at least one theme with ${MODES.join(" and ")} tokens`);
  } else {
    const reference = new Map(byTheme.get(first)!.light.map((token) => [dotted(relativePath(token.path)), token]));
    const referenceName = `${THEMES}.${first}.light`;
    if (reference.size === 0) problems.push(`${referenceName} has no tokens`);
    for (const [theme, modes] of byTheme) {
      const ordered = {} as Record<Mode, Token[]>;
      for (const mode of MODES) {
        const prefix = `${THEMES}.${theme}.${mode}`;
        const tokens = new Map(modes[mode].map((token) => [dotted(relativePath(token.path)), token]));
        for (const [key, token] of reference) {
          const other = tokens.get(key);
          if (!other) problems.push(`${prefix}.${key}: missing; every theme and mode needs the tokens of ${referenceName}`);
          else if (other.type !== token.type) {
            problems.push(`${prefix}.${key}: is a ${other.type} token, but ${referenceName}.${key} is a ${token.type}`);
          }
        }
        for (const key of tokens.keys()) {
          if (!reference.has(key)) problems.push(`${prefix}.${key}: not in ${referenceName}; every theme and mode holds the same tokens`);
        }
        // Emit every theme and mode in the reference order, so that the
        // generated blocks line up when compared side by side.
        ordered[mode] = [...reference.keys()].flatMap((key) => tokens.get(key) ?? []);
      }
      themes.set(theme, ordered);
    }
  }

  const emitted = [...global, ...(first === undefined ? [] : byTheme.get(first)!.light)];
  const dartNames = new Map<string, string>();
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
      if (kind === "Dart") {
        dartNames.set(generated, dotted(token.path));
        if (!DART_IDENTIFIER.test(generated) || DART_RESERVED.has(generated) || DART_TAKEN.has(generated)) {
          problems.push(`${dotted(token.path)}: ${generated} is not a usable Dart identifier`);
        }
      }
    }
  }
  for (const theme of byTheme.keys()) {
    const generated = camelCase([theme]);
    const clash = dartNames.get(generated);
    if (clash) problems.push(`${THEMES}.${theme}: its Dart name ${generated} is also ${clash}'s`);
    else if (DART_RESERVED.has(generated) || DART_TAKEN.has(generated)) {
      problems.push(`${THEMES}.${theme}: ${generated} is not a usable Dart identifier`);
    }
  }

  if (problems.length > 0) throw new TokenError(problems);
  return { set, global, themes };
}

/** The default theme: the first in the source. */
export function defaultTheme(design: Design): string {
  const [first] = design.themes.keys();
  return first!;
}
