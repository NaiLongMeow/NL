import { describe, expect, it } from "vitest";
import { TokenError, parseTokens } from "./dtcg.ts";
import { buildDesign, cssName, dartName, type Design } from "./model.ts";
import { cssProperties, emitCss } from "./emit-css.ts";
import { emitTs } from "./emit-ts.ts";
import { emitDart } from "./emit-dart.ts";

const srgb = (hex: string, alpha?: number) => {
  const value = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) => Math.round((((value >> shift) & 0xff) / 255) * 10000) / 10000;
  return {
    colorSpace: "srgb",
    components: [channel(16), channel(8), channel(0)],
    ...(alpha === undefined ? {} : { alpha }),
    hex,
  };
};
const px = (value: number) => ({ value, unit: "px" });
const flutter = (families: string[]) => ({ "dev.nailongmeow.nl": { flutter: families } });

const theme = (text: string, page: string) => ({
  color: {
    $type: "color",
    text: { $description: "Body text.", $value: `{palette.${text}}` },
    page: { $value: `{palette.${page}}` },
    veil: { $value: srgb("#211d1a", 0.05) },
  },
  shadow: {
    $type: "shadow",
    pop: { $value: [{ color: srgb("#000000", 0.1), offsetX: px(0), offsetY: px(2), blur: px(8), spread: px(0) }] },
  },
});

/** A small design with every kind of token the emitters handle. */
function fixture(): Record<string, unknown> {
  const light = theme("ink", "paper");
  const dark = theme("moon", "night");
  (light.color as Record<string, unknown>).quote = { $value: "{light.color.text}" };
  (dark.color as Record<string, unknown>).quote = { $value: "{dark.color.text}" };
  return {
    palette: {
      $type: "color",
      ink: { $value: srgb("#211d1a") },
      paper: { $value: srgb("#fbfaf7") },
      moon: { $value: srgb("#ece9e5") },
      night: { $value: srgb("#1c1a18") },
    },
    light,
    dark,
    font: {
      family: {
        $type: "fontFamily",
        sans: { $value: ["-apple-system", "Segoe UI", "sans-serif"], $extensions: flutter([]) },
        mono: { $value: ["Menlo", "monospace"], $extensions: flutter(["Menlo", "monospace"]) },
      },
      size: { $type: "dimension", md: { $value: px(14) } },
    },
    type: {
      $type: "typography",
      body: {
        $description: "Reading text.",
        $value: { fontFamily: "{font.family.sans}", fontSize: "{font.size.md}", fontWeight: 400, letterSpacing: px(0), lineHeight: 1.5 },
      },
      code: {
        $value: { fontFamily: "{font.family.mono}", fontSize: px(13), fontWeight: 400, letterSpacing: px(0), lineHeight: 1.45 },
      },
    },
    motion: {
      duration: { $type: "duration", fast: { $value: { value: 150, unit: "ms" } } },
      easing: { $type: "cubicBezier", out: { $value: [0, 0, 0.2, 1] } },
    },
    space: { $type: "dimension", "1": { $value: px(4) } },
  };
}

function design(json: Record<string, unknown> = fixture()): Design {
  return buildDesign(parseTokens(json));
}

function problemsOf(json: Record<string, unknown>): readonly string[] {
  try {
    design(json);
  } catch (error) {
    if (error instanceof TokenError) return error.problems;
    throw error;
  }
  throw new Error("expected the design to be rejected");
}

describe("names", () => {
  it("drops the theme from CSS and Dart names", () => {
    expect(cssName(["light", "color", "surface", "app"])).toBe("--nl-color-surface-app");
    expect(cssName(["dark", "color", "surface", "app"])).toBe("--nl-color-surface-app");
    expect(dartName(["light", "color", "accent", "on-fill"])).toBe("colorAccentOnFill");
  });

  it("keeps the full path of global tokens", () => {
    expect(cssName(["font", "size", "2xl"])).toBe("--nl-font-size-2xl");
    expect(dartName(["font", "size", "2xl"])).toBe("fontSize2xl");
    expect(dartName(["space", "1"])).toBe("space1");
  });
});

describe("buildDesign", () => {
  it("splits tokens into global and per-theme lists, without primitives", () => {
    const { global, themes } = design();
    expect(global.map((token) => token.path.join("."))).toEqual([
      "font.family.sans",
      "font.family.mono",
      "font.size.md",
      "type.body",
      "type.code",
      "motion.duration.fast",
      "motion.easing.out",
      "space.1",
    ]);
    expect(themes.light.map((token) => token.path.join("."))).toEqual([
      "light.color.text",
      "light.color.page",
      "light.color.veil",
      "light.color.quote",
      "light.shadow.pop",
    ]);
    expect(themes.dark.map((token) => token.path.slice(1).join("."))).toEqual(
      themes.light.map((token) => token.path.slice(1).join(".")),
    );
  });

  it("emits the second theme in the first theme's order", () => {
    const json = fixture();
    const dark = json.dark as { color: Record<string, unknown> };
    const { page, ...rest } = dark.color;
    dark.color = { ...rest, page };
    expect(design(json).themes.dark.map((token) => token.path.join("."))).toEqual([
      "dark.color.text",
      "dark.color.page",
      "dark.color.veil",
      "dark.color.quote",
      "dark.shadow.pop",
    ]);
  });

  it("requires both themes to hold the same tokens with the same types", () => {
    const json = fixture();
    const dark = json.dark as { color: Record<string, unknown>; shadow: Record<string, unknown> };
    delete dark.color.page;
    dark.color.extra = { $value: "{palette.night}" };
    dark.shadow.pop = { $type: "color", $value: "{palette.night}" };
    expect(problemsOf(json)).toEqual([
      "dark.color.page: missing; every theme needs the tokens of light",
      "dark.shadow.pop: is a color token, but light.shadow.pop is a shadow",
      "dark.color.extra: not in light; every theme holds the same tokens",
    ]);
  });

  it("keeps aliases in scope", () => {
    const json = fixture();
    (json.light as { color: Record<string, unknown> }).color.quote = { $value: "{dark.color.text}" };
    (json.space as Record<string, unknown>)["2"] = { $type: "color", $value: "{light.color.text}" };
    (json.palette as Record<string, unknown>).pale = { $value: "{light.color.page}" };
    expect(problemsOf(json)).toEqual([
      "palette.pale: a primitive token cannot alias {light.color.page}",
      "light.color.quote: a light token cannot alias {dark.color.text}",
      "space.2: a global token cannot alias {light.color.text}",
    ]);
  });

  it("rejects two tokens that would get the same generated name", () => {
    const json = fixture();
    json["a-b"] = { $type: "number", c: { $value: 1 } };
    json.a = { $type: "number", "b-c": { $value: 2 } };
    expect(problemsOf(json)).toEqual([
      "a.b-c: its CSS name --nl-a-b-c is also a-b.c's",
      "a.b-c: its Dart name aBC is also a-b.c's",
    ]);
  });
});

describe("emitCss", () => {
  const css = emitCss(design());

  it("puts global tokens and the light theme on :root", () => {
    const root = css.slice(css.indexOf(":root {"), css.indexOf("}\n"));
    expect(root).toContain('  --nl-font-family-sans: -apple-system, "Segoe UI", sans-serif;\n');
    expect(root).toContain("  --nl-space-1: 4px;\n");
    expect(root).toContain("  color-scheme: light;\n");
    expect(root).toContain("  /* Body text. */\n  --nl-color-text: #211d1a;\n");
  });

  it("applies the dark theme by system preference and by data-theme", () => {
    expect(css).toContain(
      '@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n    color-scheme: dark;\n    --nl-color-text: #ece9e5;\n',
    );
    expect(css).toContain(':root[data-theme="dark"] {\n  color-scheme: dark;\n  --nl-color-text: #ece9e5;\n');
    // Descriptions appear once, in the light block.
    expect(css.match(/Body text\./g)).toHaveLength(1);
  });

  it("keeps aliases of emitted tokens as var() and writes out primitives", () => {
    expect(css).toContain("  --nl-color-quote: var(--nl-color-text);\n");
    expect(css).toContain("  --nl-type-body-font-size: var(--nl-font-size-md);\n");
    expect(css).toContain("  --nl-type-code-font-size: 13px;\n");
    expect(css).not.toContain("palette");
  });

  it("writes translucent colors, shadows, durations, and curves as CSS", () => {
    expect(css).toContain("  --nl-color-veil: rgb(33 29 26 / 0.05);\n");
    expect(css).toContain("  --nl-shadow-pop: 0px 2px 8px 0px rgb(0 0 0 / 0.1);\n");
    expect(css).toContain("  --nl-motion-duration-fast: 150ms;\n");
    expect(css).toContain("  --nl-motion-easing-out: cubic-bezier(0, 0, 0.2, 1);\n");
  });

  it("expands typography into one property per part", () => {
    for (const part of ["font-family", "font-size", "font-weight", "letter-spacing", "line-height"]) {
      expect(css).toContain(`--nl-type-body-${part}: `);
    }
  });

  it("stops interface motion when reduced motion is on", () => {
    expect(css).toContain(
      "@media (prefers-reduced-motion: reduce) {\n  :root {\n    --nl-motion-duration-fast: 0ms;\n  }\n}\n",
    );
  });

  it("gives every property a unique name", () => {
    const properties = cssProperties(design());
    expect(new Set(properties).size).toBe(properties.length);
  });
});

describe("emitTs", () => {
  const ts = emitTs(design());

  it("nests global and theme tokens by path, with values ready for script", () => {
    expect(ts).toContain("export const tokens = {\n  font: {\n    family: {\n");
    expect(ts).toContain("      md: 14,\n");
    expect(ts).toContain('    "1": 4,\n');
    expect(ts).toContain("      fast: 150,\n");
    expect(ts).toContain("      out: [0, 0, 0.2, 1],\n");
    expect(ts).toContain(
      "    body: { fontFamily: '-apple-system, \"Segoe UI\", sans-serif', fontSize: 14, fontWeight: 400, letterSpacing: 0, lineHeight: 1.5 },\n",
    );
    expect(ts).toContain('  light: {\n    color: {\n      /** Body text. */\n      text: "#211d1a",\n');
    expect(ts).toContain('  dark: {\n    color: {\n      text: "#ece9e5",\n');
    expect(ts).toContain('      quote: "#ece9e5",\n');
    expect(ts).toContain('      pop: "0px 2px 8px 0px rgb(0 0 0 / 0.1)",\n');
    expect(ts).toContain("export type ThemeName = keyof typeof themes;\n");
  });
});

describe("emitDart", () => {
  const dart = emitDart(design());

  it("switches the formatter off for the generated file", () => {
    expect(dart).toContain("// dart format off\n");
  });

  it("makes theme tokens fields of NlThemeTokens with one constant per theme", () => {
    expect(dart).toContain("  /// Body text.\n  final Color colorText;\n");
    expect(dart).toContain("  static const NlThemeTokens light = NlThemeTokens(\n    colorText: Color(0xFF211D1A),\n");
    expect(dart).toContain("  static const NlThemeTokens dark = NlThemeTokens(\n    colorText: Color(0xFFECE9E5),\n");
    expect(dart).toContain("    colorVeil: Color(0x0D211D1A),\n");
    expect(dart).toContain(
      "    shadowPop: [\n      BoxShadow(color: Color(0x1A000000), offset: Offset(0, 2), blurRadius: 8),\n    ],\n",
    );
    expect(dart).toContain("      colorText: Color.lerp(a.colorText, b.colorText, t)!,\n");
    expect(dart).toContain("      shadowPop: BoxShadow.lerpList(a.shadowPop, b.shadowPop, t)!,\n");
  });

  it("makes global tokens static constants", () => {
    expect(dart).toContain("  static const List<String> fontFamilySans = <String>[];\n");
    expect(dart).toContain("  static const List<String> fontFamilyMono = <String>['Menlo', 'monospace'];\n");
    expect(dart).toContain("  static const double fontSizeMd = 14;\n");
    expect(dart).toContain("  static const Duration motionDurationFast = Duration(milliseconds: 150);\n");
    expect(dart).toContain("  static const Cubic motionEasingOut = Cubic(0, 0, 0.2, 1);\n");
    expect(dart).toContain("  static const double space1 = 4;\n");
  });

  it("uses the platform font unless the family's Flutter list names one", () => {
    expect(dart).toContain(
      "  static const TextStyle typeBody = TextStyle(\n    fontSize: 14,\n    fontWeight: FontWeight.w400,\n",
    );
    expect(dart).toContain(
      "  static const TextStyle typeCode = TextStyle(\n    fontFamily: 'Menlo',\n    fontFamilyFallback: <String>['monospace'],\n",
    );
    expect(dart).toContain("    height: 1.5,\n    leadingDistribution: TextLeadingDistribution.even,\n  );\n");
  });

  it("refuses what Flutter cannot express", () => {
    const inset = fixture();
    for (const name of ["light", "dark"]) {
      const layer = (inset[name] as { shadow: { pop: { $value: Array<Record<string, unknown>> } } }).shadow.pop.$value[0]!;
      layer.inset = true;
    }
    expect(() => emitDart(design(inset))).toThrow(/no inset shadows/);

    const weight = fixture();
    ((weight.type as Record<string, { $value: Record<string, unknown> }>).body!.$value).fontWeight = 450;
    expect(() => emitDart(design(weight))).toThrow(/FontWeight.w100 to w900/);

    const family = fixture();
    delete (family.font as { family: { mono: Record<string, unknown> } }).family.mono.$extensions;
    expect(() => emitDart(design(family))).toThrow(/needs "\$extensions"/);
  });
});
