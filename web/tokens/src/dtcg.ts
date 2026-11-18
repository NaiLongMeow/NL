/**
 * Reads a design token file in the W3C Design Tokens Community Group format,
 * version 2025.10 (https://www.designtokens.org/tr/2025.10/format/).
 *
 * This is not a general implementation of the format. It accepts the subset
 * NL's tokens use and rejects everything else with an error that names the
 * token, so that nothing in the source is silently ignored:
 *
 * - types: color (sRGB only, with a `hex` fallback that must match the
 *   components), dimension (px only, since Flutter has no rem), fontFamily,
 *   fontWeight, duration, cubicBezier, number, shadow (no references inside
 *   a shadow array), and typography;
 * - curly-brace aliases (`"{group.token}"`), for a whole value or for a
 *   sub-value of a shadow or typography;
 * - `$type` inherited from groups, and `$description` and `$extensions`.
 *
 * Not supported, and reported as errors: JSON Pointer references (`$ref`),
 * `$extends`, `$root`, `$deprecated`, and the types strokeStyle, border,
 * transition, and gradient. Add them here, with tests, when a token needs
 * them.
 *
 * On top of the format, NL requires token and group names in lowercase
 * kebab case, so that every path maps cleanly onto CSS custom property
 * names and Dart identifiers.
 */

import { hexToRgb, toByte } from "./color.ts";

export type TokenType =
  | "color"
  | "dimension"
  | "fontFamily"
  | "fontWeight"
  | "duration"
  | "cubicBezier"
  | "number"
  | "shadow"
  | "typography";

const TOKEN_TYPES: ReadonlySet<string> = new Set<TokenType>([
  "color",
  "dimension",
  "fontFamily",
  "fontWeight",
  "duration",
  "cubicBezier",
  "number",
  "shadow",
  "typography",
]);

/** Types defined by the format that this reader does not handle yet. */
const UNSUPPORTED_TYPES: ReadonlySet<string> = new Set(["strokeStyle", "border", "transition", "gradient"]);

/** An sRGB color; `r`, `g`, and `b` are the token's components, 0 to 1. */
export interface Color {
  r: number;
  g: number;
  b: number;
  alpha: number;
  /** The token's six-digit `hex` fallback, lowercase. */
  hex: string;
}

/** A length in CSS pixels (Flutter logical pixels). */
export interface Dimension {
  px: number;
}

/** A duration, normalized to milliseconds. */
export interface Duration {
  ms: number;
}

export type CubicBezier = readonly [number, number, number, number];

/** A path into the token tree, such as `["font", "size", "md"]`. */
export type Path = readonly string[];

/** A sub-value of a composite token: either a literal or an alias. */
export type Part<T> = { readonly literal: T } | { readonly alias: Path };

export interface ShadowLayer {
  color: Part<Color>;
  offsetX: Part<Dimension>;
  offsetY: Part<Dimension>;
  blur: Part<Dimension>;
  spread: Part<Dimension>;
  inset: boolean;
}

export interface Typography {
  fontFamily: Part<readonly string[]>;
  fontSize: Part<Dimension>;
  fontWeight: Part<number>;
  letterSpacing: Part<Dimension>;
  lineHeight: Part<number>;
}

/** The literal value of a token, by its type. */
export interface ValueOf {
  color: Color;
  dimension: Dimension;
  fontFamily: readonly string[];
  fontWeight: number;
  duration: Duration;
  cubicBezier: CubicBezier;
  number: number;
  shadow: readonly ShadowLayer[];
  typography: Typography;
}

export type Value = ValueOf[TokenType];

/** A token as written: its value is either a literal or an alias of another token. */
export interface Token {
  path: Path;
  type: TokenType;
  description?: string;
  extensions?: Readonly<Record<string, unknown>>;
  value: Part<Value>;
}

/** A parsed token file: every token by its dotted path, in file order. */
export interface TokenSet {
  /** Description of the file itself (the root group's `$description`). */
  description?: string;
  tokens: ReadonlyMap<string, Token>;
}

/** Thrown when a token file breaks the format or this reader's rules; lists every problem found. */
export class TokenError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(`invalid design tokens:\n${problems.map((problem) => `- ${problem}`).join("\n")}`);
    this.name = "TokenError";
    this.problems = problems;
  }
}

/** Joins a path with dots, the form aliases use. */
export function dotted(path: Path): string {
  return path.join(".");
}

/** Lowercase kebab case: CSS custom property names and Dart identifiers are derived from it. */
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ALIAS = /^\{([^{}]+)\}$/;

const GROUP_PROPERTIES: ReadonlySet<string> = new Set(["$type", "$description", "$extensions"]);
const TOKEN_PROPERTIES: ReadonlySet<string> = new Set(["$value", "$type", "$description", "$extensions"]);

const FONT_WEIGHT_NAMES: Readonly<Record<string, number>> = {
  thin: 100,
  hairline: 100,
  "extra-light": 200,
  "ultra-light": 200,
  light: 300,
  normal: 400,
  regular: 400,
  book: 400,
  medium: 500,
  "semi-bold": 600,
  "demi-bold": 600,
  bold: 700,
  "extra-bold": 800,
  "ultra-bold": 800,
  black: 900,
  heavy: 900,
  "extra-black": 950,
  "ultra-black": 950,
};

/** A token as found in the file, before its type and value are checked. */
interface RawToken {
  path: Path;
  /** The token's own `$type`, if it has one. */
  ownType?: string;
  /** The nearest ancestor group's `$type`. */
  inheritedType?: string;
  description?: string;
  extensions?: Record<string, unknown>;
  value: unknown;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parses and checks a token file's JSON. Every alias must resolve, with no
 * cycles and to a token of the expected type. Throws a `TokenError` listing
 * every problem rather than stopping at the first.
 */
export function parseTokens(json: unknown): TokenSet {
  const problems: string[] = [];
  const raw = new Map<string, RawToken>();

  if (!isObject(json)) throw new TokenError(["the file must hold a JSON object"]);
  collect(json, [], undefined, raw, problems);

  // Types first: an alias without its own `$type` takes the type of the
  // token it points to (format 2025.10, section 6), which needs every other
  // token's type, so types are resolved for all tokens before any value is
  // checked. `null` marks a token whose type could not be determined; its
  // problem has been reported once.
  const settled = new Map<string, TokenType | null>();
  for (const key of raw.keys()) resolveType(key, raw, settled, problems);
  const types = new Map<string, TokenType>();
  for (const [key, type] of settled) if (type) types.set(key, type);

  const tokens = new Map<string, Token>();
  for (const [key, token] of raw) {
    const type = types.get(key);
    if (!type) continue;
    const value = parsePart(token.value, type, key, raw, types, problems);
    if (!value) continue;
    tokens.set(key, {
      path: token.path,
      type,
      ...(token.description !== undefined ? { description: token.description } : {}),
      ...(token.extensions !== undefined ? { extensions: token.extensions } : {}),
      value,
    });
  }

  if (problems.length > 0) throw new TokenError(problems);
  const description = typeof json.$description === "string" ? json.$description : undefined;
  return { ...(description !== undefined ? { description } : {}), tokens };
}

/** Walks the tree and records every token with the group `$type` it inherits. */
function collect(
  group: Record<string, unknown>,
  path: Path,
  inheritedType: string | undefined,
  raw: Map<string, RawToken>,
  problems: string[],
): void {
  const where = path.length > 0 ? `group ${dotted(path)}` : "the root group";
  for (const key of Object.keys(group)) {
    if (key.startsWith("$") && !GROUP_PROPERTIES.has(key)) {
      problems.push(`${where}: ${key} is not supported by NL's token reader`);
    }
  }
  if (group.$description !== undefined && typeof group.$description !== "string") {
    problems.push(`${where}: $description must be a string`);
  }
  if (group.$extensions !== undefined && !isObject(group.$extensions)) {
    problems.push(`${where}: $extensions must be an object`);
  }
  const groupType = typeof group.$type === "string" ? group.$type : undefined;
  if (group.$type !== undefined && groupType === undefined) problems.push(`${where}: $type must be a string`);
  const typeHere = groupType ?? inheritedType;

  for (const [name, child] of Object.entries(group)) {
    if (name.startsWith("$")) continue;
    const childPath = [...path, name];
    if (!NAME.test(name)) {
      problems.push(`${dotted(childPath)}: names must be lowercase kebab case (letters, digits, single hyphens)`);
      continue;
    }
    if (path.length === 0 && !/^[a-z]/.test(name)) {
      problems.push(`${name}: top-level names must start with a letter`);
      continue;
    }
    if (!isObject(child)) {
      problems.push(`${dotted(childPath)}: must be a token or a group (an object)`);
      continue;
    }
    if ("$value" in child) {
      const childGroups = Object.keys(child).filter((key) => !key.startsWith("$"));
      if (childGroups.length > 0) {
        problems.push(`${dotted(childPath)}: a token cannot also contain tokens or groups (${childGroups.join(", ")})`);
      }
      for (const key of Object.keys(child)) {
        if (key.startsWith("$") && !TOKEN_PROPERTIES.has(key)) {
          problems.push(`${dotted(childPath)}: ${key} is not supported by NL's token reader`);
        }
      }
      if (child.$description !== undefined && typeof child.$description !== "string") {
        problems.push(`${dotted(childPath)}: $description must be a string`);
      }
      if (child.$extensions !== undefined && !isObject(child.$extensions)) {
        problems.push(`${dotted(childPath)}: $extensions must be an object`);
      }
      if (child.$type !== undefined && typeof child.$type !== "string") {
        problems.push(`${dotted(childPath)}: $type must be a string`);
      }
      raw.set(dotted(childPath), {
        path: childPath,
        ...(typeof child.$type === "string" ? { ownType: child.$type } : {}),
        ...(typeHere !== undefined ? { inheritedType: typeHere } : {}),
        ...(typeof child.$description === "string" ? { description: child.$description } : {}),
        ...(isObject(child.$extensions) ? { extensions: child.$extensions } : {}),
        value: child.$value,
      });
    } else {
      collect(child, childPath, typeHere, raw, problems);
    }
  }
}

/**
 * Determines a token's type: its own `$type`; otherwise, for an alias, the
 * type of the token it points to; otherwise the type it inherits from its
 * groups. The format forbids guessing a type from the value.
 */
function resolveType(
  key: string,
  raw: ReadonlyMap<string, RawToken>,
  settled: Map<string, TokenType | null>,
  problems: string[],
): TokenType | undefined {
  const known = settled.get(key);
  if (known !== undefined) return known ?? undefined;
  const token = raw.get(key);
  if (!token) return undefined;
  const fail = (message: string) => {
    problems.push(`${key}: ${message}`);
    settled.set(key, null);
    return undefined;
  };

  let type: string | undefined = token.ownType;
  if (type === undefined) {
    const alias = aliasTarget(token.value);
    if (alias !== undefined) {
      if (!raw.has(alias)) return fail(`the alias {${alias}} points to no token`);
      const cycle = aliasCycle(alias, raw, [key]);
      if (cycle) return fail(`aliases form a cycle: ${cycle.join(" -> ")}`);
      type = resolveType(alias, raw, settled, problems);
      if (type === undefined) {
        // The target's own problem has been reported; this token just fails with it.
        settled.set(key, null);
        return undefined;
      }
    } else {
      type = token.inheritedType;
    }
  }
  if (type === undefined) return fail("has no $type, and none can be determined from an alias or a group");
  if (UNSUPPORTED_TYPES.has(type)) return fail(`the type ${type} is not supported by NL's token reader yet`);
  if (!TOKEN_TYPES.has(type)) return fail(`unknown $type ${type}`);
  settled.set(key, type as TokenType);
  return type as TokenType;
}

/** The dotted target of a curly-brace alias, or undefined if `value` is not one. */
function aliasTarget(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return ALIAS.exec(value)?.[1];
}

/**
 * Parses a value or sub-value of the given type. An alias is checked to
 * resolve, without cycles, to a token of the same type.
 */
function parsePart<T extends TokenType>(
  value: unknown,
  type: T,
  where: string,
  raw: ReadonlyMap<string, RawToken>,
  types: ReadonlyMap<string, TokenType>,
  problems: string[],
): Part<ValueOf[T]> | undefined {
  const target = aliasTarget(value);
  if (target !== undefined) {
    if (!raw.has(target)) {
      problems.push(`${where}: the alias {${target}} points to no token`);
      return undefined;
    }
    const cycle = aliasCycle(target, raw, [where]);
    if (cycle) {
      problems.push(`${where}: aliases form a cycle: ${cycle.join(" -> ")}`);
      return undefined;
    }
    const targetType = types.get(target);
    if (targetType === undefined) return undefined; // Its own problem is already reported.
    if (targetType !== type) {
      problems.push(`${where}: the alias {${target}} points to a ${targetType} token where a ${type} is required`);
      return undefined;
    }
    return { alias: target.split(".") };
  }
  if (typeof value === "string" && (value.includes("{") || value.includes("}"))) {
    problems.push(`${where}: ${JSON.stringify(value)} is not a valid alias; write "{group.token}"`);
    return undefined;
  }
  if (isObject(value) && "$ref" in value) {
    problems.push(`${where}: JSON Pointer references ($ref) are not supported by NL's token reader`);
    return undefined;
  }
  const literal = parseLiteral(value, type, where, raw, types, problems);
  return literal === undefined ? undefined : { literal };
}

/** Follows an alias chain from `start`; returns the chain if it loops back on itself. */
function aliasCycle(start: string, raw: ReadonlyMap<string, RawToken>, seen: readonly string[]): string[] | undefined {
  const chain = [...seen];
  let current: string | undefined = start;
  while (current !== undefined) {
    if (chain.includes(current)) return [...chain, current];
    chain.push(current);
    const token = raw.get(current);
    current = token ? aliasTarget(token.value) : undefined;
  }
  return undefined;
}

function parseLiteral<T extends TokenType>(
  value: unknown,
  type: T,
  where: string,
  raw: ReadonlyMap<string, RawToken>,
  types: ReadonlyMap<string, TokenType>,
  problems: string[],
): ValueOf[T] | undefined {
  const fail = (message: string) => {
    problems.push(`${where}: ${message}`);
    return undefined;
  };
  switch (type) {
    case "color":
      return parseColor(value, fail) as ValueOf[T] | undefined;
    case "dimension":
      return parseDimension(value, fail) as ValueOf[T] | undefined;
    case "fontFamily": {
      if (typeof value === "string" && value.length > 0) return [value] as unknown as ValueOf[T];
      if (Array.isArray(value) && value.length > 0 && value.every((name) => typeof name === "string" && name.length > 0)) {
        return value as unknown as ValueOf[T];
      }
      return fail("a fontFamily must be a name or a non-empty array of names");
    }
    case "fontWeight": {
      if (typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 1000) return value as ValueOf[T];
      if (typeof value === "string" && value in FONT_WEIGHT_NAMES) return FONT_WEIGHT_NAMES[value] as ValueOf[T];
      return fail(`a fontWeight must be a number from 1 to 1000 or a weight name such as "semi-bold", not ${JSON.stringify(value)}`);
    }
    case "duration": {
      if (!isObject(value) || typeof value.value !== "number" || !Number.isFinite(value.value) || value.value < 0) {
        return fail('a duration must be { "value": <number of 0 or more>, "unit": "ms" | "s" }');
      }
      if (value.unit === "ms") return { ms: value.value } as ValueOf[T];
      if (value.unit === "s") return { ms: value.value * 1000 } as ValueOf[T];
      return fail(`a duration's unit must be "ms" or "s", not ${JSON.stringify(value.unit)}`);
    }
    case "cubicBezier": {
      if (!Array.isArray(value) || value.length !== 4 || !value.every((n) => typeof n === "number" && Number.isFinite(n))) {
        return fail("a cubicBezier must be an array of four numbers");
      }
      const [x1, , x2] = value as number[];
      if (x1! < 0 || x1! > 1 || x2! < 0 || x2! > 1) return fail("a cubicBezier's x values must lie between 0 and 1");
      return value as unknown as ValueOf[T];
    }
    case "number":
      if (typeof value === "number" && Number.isFinite(value)) return value as ValueOf[T];
      return fail("a number token must hold a number");
    case "shadow":
      return parseShadow(value, where, raw, types, problems) as ValueOf[T] | undefined;
    case "typography":
      return parseTypography(value, where, raw, types, problems) as ValueOf[T] | undefined;
  }
  return fail(`unhandled type ${String(type)}`);
}

function parseColor(value: unknown, fail: (message: string) => undefined): Color | undefined {
  if (!isObject(value)) return fail('a color must be an object such as { "colorSpace": "srgb", "components": [r, g, b], "hex": "#rrggbb" }');
  if (value.colorSpace !== "srgb") {
    return fail(`only the srgb color space is supported, not ${JSON.stringify(value.colorSpace)}`);
  }
  const components = value.components;
  if (
    !Array.isArray(components) ||
    components.length !== 3 ||
    !components.every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1)
  ) {
    return fail("an srgb color needs three components from 0 to 1 (the keyword none is not supported)");
  }
  const alpha = value.alpha ?? 1;
  if (typeof alpha !== "number" || !Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
    return fail("a color's alpha must be a number from 0 to 1");
  }
  // The format makes `hex` optional; NL requires it, because a person reading
  // the file recognizes "#07618f" and not a list of fractions, and the check
  // below keeps the two from drifting apart.
  if (typeof value.hex !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value.hex)) {
    return fail('NL requires every color to carry its six-digit "hex" fallback');
  }
  const [r, g, b] = components as [number, number, number];
  const hex = value.hex.toLowerCase();
  const fromHex = hexToRgb(hex);
  if (toByte(r) !== toByte(fromHex.r) || toByte(g) !== toByte(fromHex.g) || toByte(b) !== toByte(fromHex.b)) {
    const expected = [fromHex.r, fromHex.g, fromHex.b].map((channel) => Math.round(channel * 10000) / 10000);
    return fail(`hex ${hex} does not match the components; for ${hex} they are [${expected.join(", ")}]`);
  }
  return { r, g, b, alpha, hex };
}

function parseDimension(value: unknown, fail: (message: string) => undefined): Dimension | undefined {
  if (!isObject(value) || typeof value.value !== "number" || !Number.isFinite(value.value)) {
    return fail('a dimension must be { "value": <number>, "unit": "px" }');
  }
  if (value.unit !== "px") {
    return fail(`dimensions must use px (the Flutter app has no rem), not ${JSON.stringify(value.unit)}`);
  }
  return { px: value.value };
}

function parseShadow(
  value: unknown,
  where: string,
  raw: ReadonlyMap<string, RawToken>,
  types: ReadonlyMap<string, TokenType>,
  problems: string[],
): ShadowLayer[] | undefined {
  const layers = Array.isArray(value) ? value : [value];
  if (layers.length === 0) {
    problems.push(`${where}: a shadow needs at least one layer`);
    return undefined;
  }
  const parsed: ShadowLayer[] = [];
  let failed = false;
  layers.forEach((layer, index) => {
    const at = Array.isArray(value) ? `${where}[${index}]` : where;
    if (!isObject(layer)) {
      // An alias of a whole shadow inside an array is valid in the format,
      // but nothing in NL needs it yet.
      problems.push(`${at}: a shadow layer must be an object with color, offsetX, offsetY, blur, and spread`);
      failed = true;
      return;
    }
    const color = parsePart(layer.color, "color", `${at}.color`, raw, types, problems);
    const offsetX = parsePart(layer.offsetX, "dimension", `${at}.offsetX`, raw, types, problems);
    const offsetY = parsePart(layer.offsetY, "dimension", `${at}.offsetY`, raw, types, problems);
    const blur = parsePart(layer.blur, "dimension", `${at}.blur`, raw, types, problems);
    const spread = parsePart(layer.spread, "dimension", `${at}.spread`, raw, types, problems);
    if (layer.inset !== undefined && typeof layer.inset !== "boolean") {
      problems.push(`${at}.inset: must be true or false`);
      failed = true;
    }
    const unknown = Object.keys(layer).filter((key) => !["color", "offsetX", "offsetY", "blur", "spread", "inset"].includes(key));
    if (unknown.length > 0) {
      problems.push(`${at}: unknown shadow properties ${unknown.join(", ")}`);
      failed = true;
    }
    if (!color || !offsetX || !offsetY || !blur || !spread) {
      failed = true;
      return;
    }
    parsed.push({ color, offsetX, offsetY, blur, spread, inset: layer.inset === true });
  });
  return failed ? undefined : parsed;
}

function parseTypography(
  value: unknown,
  where: string,
  raw: ReadonlyMap<string, RawToken>,
  types: ReadonlyMap<string, TokenType>,
  problems: string[],
): Typography | undefined {
  if (!isObject(value)) {
    problems.push(`${where}: a typography value must be an object with fontFamily, fontSize, fontWeight, letterSpacing, and lineHeight`);
    return undefined;
  }
  const unknown = Object.keys(value).filter(
    (key) => !["fontFamily", "fontSize", "fontWeight", "letterSpacing", "lineHeight"].includes(key),
  );
  if (unknown.length > 0) problems.push(`${where}: unknown typography properties ${unknown.join(", ")}`);
  const fontFamily = parsePart(value.fontFamily, "fontFamily", `${where}.fontFamily`, raw, types, problems);
  const fontSize = parsePart(value.fontSize, "dimension", `${where}.fontSize`, raw, types, problems);
  const fontWeight = parsePart(value.fontWeight, "fontWeight", `${where}.fontWeight`, raw, types, problems);
  const letterSpacing = parsePart(value.letterSpacing, "dimension", `${where}.letterSpacing`, raw, types, problems);
  const lineHeight = parsePart(value.lineHeight, "number", `${where}.lineHeight`, raw, types, problems);
  if (!fontFamily || !fontSize || !fontWeight || !letterSpacing || !lineHeight || unknown.length > 0) return undefined;
  return { fontFamily, fontSize, fontWeight, letterSpacing, lineHeight };
}

/** Follows aliases from a part to the literal value at the end of the chain. */
export function resolvePart<T>(set: TokenSet, part: Part<T>): T {
  let current: Part<unknown> = part;
  // parseTokens has ruled out missing targets and cycles, so this ends.
  while ("alias" in current) {
    const target = set.tokens.get(dotted(current.alias));
    if (!target) throw new Error(`unresolved alias {${dotted(current.alias)}}`);
    current = target.value;
  }
  return current.literal as T;
}

/** A token's value with every alias, including those inside composites, resolved. */
export type Resolved<T extends TokenType> = T extends "shadow"
  ? ResolvedShadowLayer[]
  : T extends "typography"
    ? ResolvedTypography
    : ValueOf[T];

export interface ResolvedShadowLayer {
  color: Color;
  offsetX: Dimension;
  offsetY: Dimension;
  blur: Dimension;
  spread: Dimension;
  inset: boolean;
}

export interface ResolvedTypography {
  fontFamily: readonly string[];
  fontSize: Dimension;
  fontWeight: number;
  letterSpacing: Dimension;
  lineHeight: number;
}

/** Resolves a token's value completely: aliases, and aliases inside composite values. */
export function resolveToken<T extends TokenType>(set: TokenSet, token: Token & { type: T }): Resolved<T> {
  const value = resolvePart(set, token.value);
  if (token.type === "shadow") {
    return (value as readonly ShadowLayer[]).map((layer) => ({
      color: resolvePart(set, layer.color),
      offsetX: resolvePart(set, layer.offsetX),
      offsetY: resolvePart(set, layer.offsetY),
      blur: resolvePart(set, layer.blur),
      spread: resolvePart(set, layer.spread),
      inset: layer.inset,
    })) as Resolved<T>;
  }
  if (token.type === "typography") {
    const typography = value as Typography;
    return {
      fontFamily: resolvePart(set, typography.fontFamily),
      fontSize: resolvePart(set, typography.fontSize),
      fontWeight: resolvePart(set, typography.fontWeight),
      letterSpacing: resolvePart(set, typography.letterSpacing),
      lineHeight: resolvePart(set, typography.lineHeight),
    } as Resolved<T>;
  }
  return value as Resolved<T>;
}
