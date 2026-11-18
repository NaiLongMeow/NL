/**
 * Writes the design tokens as Dart for the Flutter app (apps/client).
 *
 * Theme tokens become the fields of `NlThemeTokens`, with one constant per
 * theme (`NlTokens.light`, `NlTokens.dark`); global tokens become static
 * constants of `NlTokens`. The hand-written theme in
 * apps/client/lib/src/theme/ builds Flutter's `ThemeData` from them.
 *
 * Flutter cannot use CSS font stacks, so a fontFamily token carries the
 * families Flutter should ask for in its `dev.nailongmeow.nl` extension,
 * under `flutter`. An empty list means the platform's default font, which
 * is what the interface font should be on a phone.
 *
 * The file switches the Dart formatter off. CI checks the formatting of
 * apps/client after generating this file, and the generator lays the code
 * out itself, so that a formatter release cannot fail that check on a
 * change that did not touch the tokens.
 */

import { dotted, resolveToken, type Resolved, type Token, type TokenType, type Typography } from "./dtcg.ts";
import { THEMES, dartName, type Design } from "./model.ts";
import { GENERATED_NOTICE, formatNumber } from "./emit-css.ts";
import { toByte } from "./color.ts";

/** The extension key NL uses inside `$extensions`. */
export const EXTENSION = "dev.nailongmeow.nl";

const DART_TYPES: Readonly<Record<TokenType, string>> = {
  color: "Color",
  dimension: "double",
  fontFamily: "List<String>",
  fontWeight: "FontWeight",
  duration: "Duration",
  cubicBezier: "Cubic",
  number: "double",
  shadow: "List<BoxShadow>",
  typography: "TextStyle",
};

function dartString(value: string): string {
  return `'${value.replace(/[\\'$]/g, "\\$&")}'`;
}

function dartDouble(value: number): string {
  return formatNumber(value);
}

function dartColor(color: Resolved<"color">): string {
  const hex = [toByte(color.alpha), toByte(color.r), toByte(color.g), toByte(color.b)]
    .map((byte) => byte.toString(16).padStart(2, "0").toUpperCase())
    .join("");
  return `Color(0x${hex})`;
}

function dartFontWeight(weight: number, where: string): string {
  if (!Number.isInteger(weight / 100) || weight < 100 || weight > 900) {
    throw new Error(`${where}: Flutter has FontWeight.w100 to w900 only, so ${weight} cannot be expressed`);
  }
  return `FontWeight.w${weight}`;
}

/** Follows whole-value aliases to the token that holds the literal value. */
function definingToken(design: Design, token: Token): Token {
  let current = token;
  while ("alias" in current.value) {
    const target = design.set.tokens.get(dotted(current.value.alias));
    if (!target) throw new Error(`unresolved alias in ${dotted(current.path)}`);
    current = target;
  }
  return current;
}

/** The families a fontFamily token asks Flutter for (see the module comment). */
function flutterFamilies(design: Design, token: Token): readonly string[] {
  const defining = definingToken(design, token);
  const extension = defining.extensions?.[EXTENSION] as { flutter?: unknown } | undefined;
  const families = extension?.flutter;
  if (!Array.isArray(families) || !families.every((family) => typeof family === "string")) {
    throw new Error(
      `${dotted(defining.path)}: a fontFamily token needs "$extensions": { "${EXTENSION}": { "flutter": [...] } } for the Flutter app`,
    );
  }
  return families as string[];
}

/**
 * The Flutter families of a typography token. A literal font stack inside a
 * typography value carries no Flutter families, so NL's typography tokens
 * alias a fontFamily token instead.
 */
function typographyFamilies(design: Design, token: Token): readonly string[] {
  const typography = (definingToken(design, token).value as { literal: Typography }).literal;
  const part = typography.fontFamily;
  if (!("alias" in part)) {
    throw new Error(`${dotted(token.path)}: fontFamily must alias a fontFamily token, which says what Flutter uses`);
  }
  return flutterFamilies(design, design.set.tokens.get(dotted(part.alias))!);
}

function dartFamilyList(families: readonly string[]): string {
  return `<String>[${families.map(dartString).join(", ")}]`;
}

/** The Dart expression for a token's value. */
function dartValue(design: Design, token: Token, indent: string): string {
  const where = dotted(token.path);
  const value = resolveToken(design.set, token);
  switch (token.type) {
    case "color":
      return dartColor(value as Resolved<"color">);
    case "dimension":
      return dartDouble((value as Resolved<"dimension">).px);
    case "number":
      return dartDouble(value as number);
    case "fontFamily":
      return dartFamilyList(flutterFamilies(design, token));
    case "fontWeight":
      return dartFontWeight(value as number, where);
    case "duration": {
      const ms = (value as Resolved<"duration">).ms;
      return Number.isInteger(ms) ? `Duration(milliseconds: ${ms})` : `Duration(microseconds: ${Math.round(ms * 1000)})`;
    }
    case "cubicBezier":
      return `Cubic(${(value as Resolved<"cubicBezier">).map(dartDouble).join(", ")})`;
    case "shadow": {
      const layers = (value as Resolved<"shadow">).map((layer) => {
        if (layer.inset) throw new Error(`${where}: Flutter's BoxShadow has no inset shadows`);
        const args = [
          `color: ${dartColor(layer.color)}`,
          `offset: Offset(${dartDouble(layer.offsetX.px)}, ${dartDouble(layer.offsetY.px)})`,
          `blurRadius: ${dartDouble(layer.blur.px)}`,
          ...(layer.spread.px !== 0 ? [`spreadRadius: ${dartDouble(layer.spread.px)}`] : []),
        ];
        return `${indent}  BoxShadow(${args.join(", ")}),`;
      });
      return `[\n${layers.join("\n")}\n${indent}]`;
    }
    case "typography": {
      const typography = value as Resolved<"typography">;
      const families = typographyFamilies(design, token);
      const args = [
        ...(families.length > 0 ? [`fontFamily: ${dartString(families[0]!)}`] : []),
        ...(families.length > 1 ? [`fontFamilyFallback: ${dartFamilyList(families.slice(1))}`] : []),
        `fontSize: ${dartDouble(typography.fontSize.px)}`,
        `fontWeight: ${dartFontWeight(typography.fontWeight, where)}`,
        `letterSpacing: ${dartDouble(typography.letterSpacing.px)}`,
        // Flutter's `height` multiplies the font size like CSS line-height;
        // even leading distributes the extra space above and below the text
        // as CSS does, so both platforms set text the same way.
        `height: ${dartDouble(typography.lineHeight)}`,
        "leadingDistribution: TextLeadingDistribution.even",
      ];
      return `TextStyle(\n${args.map((arg) => `${indent}  ${arg},`).join("\n")}\n${indent})`;
    }
  }
}

/** Interpolation of one field in `NlThemeTokens.lerp`. */
function dartLerp(token: Token, field: string): string {
  switch (token.type) {
    case "color":
      return `Color.lerp(a.${field}, b.${field}, t)!`;
    case "shadow":
      return `BoxShadow.lerpList(a.${field}, b.${field}, t)!`;
    case "dimension":
    case "number":
      return `lerpDouble(a.${field}, b.${field}, t)!`;
    case "typography":
      return `TextStyle.lerp(a.${field}, b.${field}, t)!`;
    default:
      // Durations, curves, weights, and font lists do not blend; switch halfway.
      return `t < 0.5 ? a.${field} : b.${field}`;
  }
}

function docLines(description: string | undefined, indent: string): string[] {
  return description ? [`${indent}/// ${description}`] : [];
}

export function emitDart(design: Design): string {
  const [first] = THEMES;
  const fields = design.themes[first];
  const needsLerpDouble = fields.some((token) => token.type === "dimension" || token.type === "number");

  const lines = [
    `// ${GENERATED_NOTICE}`,
    "//",
    "// The formatter is off for this file: the generator lays it out, so that",
    "// a formatter release cannot fail the format check.",
    "// dart format off",
    "",
    ...(needsLerpDouble ? ["import 'dart:ui' show lerpDouble;", ""] : []),
    "import 'package:flutter/animation.dart' show Cubic;",
    "import 'package:flutter/painting.dart';",
    "",
    "/// The tokens that differ between themes.",
    "///",
    "/// [NlTokens.light] and [NlTokens.dark] hold the values.",
    "final class NlThemeTokens {",
    "  const NlThemeTokens({",
    ...fields.map((token) => `    required this.${dartName(token.path)},`),
    "  });",
    "",
    ...fields.flatMap((token) => [
      ...docLines(token.description, "  "),
      `  final ${DART_TYPES[token.type]} ${dartName(token.path)};`,
      "",
    ]),
    "  /// Interpolates between two themes, for an animated theme change.",
    "  static NlThemeTokens lerp(NlThemeTokens a, NlThemeTokens b, double t) {",
    "    return NlThemeTokens(",
    ...fields.map((token) => `      ${dartName(token.path)}: ${dartLerp(token, dartName(token.path))},`),
    "    );",
    "  }",
    "}",
    "",
    "/// NL's design tokens, generated from design/tokens.json.",
    "abstract final class NlTokens {",
    ...THEMES.flatMap((theme) => [
      `  /// The ${theme} theme.`,
      `  static const NlThemeTokens ${theme} = NlThemeTokens(`,
      ...design.themes[theme].map((token) => `    ${dartName(token.path)}: ${dartValue(design, token, "    ")},`),
      "  );",
      "",
    ]),
    ...design.global.flatMap((token) => [
      ...docLines(token.description, "  "),
      `  static const ${DART_TYPES[token.type]} ${dartName(token.path)} = ${dartValue(design, token, "  ")};`,
    ]),
    "}",
    "",
  ];
  return lines.join("\n");
}
