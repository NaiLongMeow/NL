import { describe, expect, it } from "vitest";
import { TokenError, parseTokens } from "./dtcg.ts";
import { buildDesign, cssName, dartName, defaultTheme, type Design } from "./model.ts";
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

/** One theme's tokens in one mode; `self` is the mode's own path, for the alias. */
const themeMode = (text: string, page: string, self: string) => ({
  color: {
    $type: "color",
    text: { $description: "Body text.", $value: `{palette.${text}}` },
    page: { $value: `{palette.${page}}` },
    veil: { $value: srgb("#211d1a", 0.05) },
    quote: { $value: `{${self}.color.text}` },
  },
  shadow: {
    $type: "shadow",
    pop: { $value: [{ color: srgb("#000000", 0.1), offsetX: px(0), offsetY: px(2), blur: px(8), spread: px(0) }] },
  },
});

const both = (name: string, text: string) => ({
  light: themeMode(text, "paper", `theme.${name}.light`),
  dark: themeMode("moon", "night", `theme.${name}.dark`),
});

/** A small design with two themes and every kind of token the emitters handle. */
function fixture(): Record<string, unknown> {
  return {
    palette: {
      $type: "color",
      ink: { $value: srgb("#211d1a") },
      paper: { $value: srgb("#fbfaf7") },
      moon: { $value: srgb("#ece9e5") },
      night: { $value: srgb("#1c1a18") },
      rose: { $value: srgb("#a43066") },
    },
    theme: { day: both("day", "ink"), rose: both("rose", "rose") },
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

type Groups = Record<string, Record<string, unknown>>;

/** The groups of one theme and mode in a fixture, for editing. */
function modeOf(json: Record<string, unknown>, theme: string, mode: string): Groups {
  return (json.theme as Record<string, Record<string, Groups>>)[theme]![mode]!;
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
  it("drops the theme and the mode from CSS and Dart names", () => {
    expect(cssName(["theme", "sea", "light", "color", "surface", "app"])).toBe("--nl-color-surface-app");
    expect(cssName(["theme", "sakura", "dark", "color", "surface", "app"])).toBe("--nl-color-surface-app");
    expect(dartName(["theme", "sea", "light", "color", "accent", "on-fill"])).toBe("colorAccentOnFill");
  });

  it("keeps the full path of global tokens", () => {
    expect(cssName(["font", "size", "2xl"])).toBe("--nl-font-size-2xl");
    expect(dartName(["font", "size", "2xl"])).toBe("fontSize2xl");
    expect(dartName(["space", "1"])).toBe("space1");
  });
});

describe("buildDesign", () => {
  it("splits tokens into global tokens and each theme's modes, without primitives", () => {
    const built = design();
    expect(built.global.map((token) => token.path.join("."))).toEqual([
      "font.family.sans",
      "font.family.mono",
      "font.size.md",
      "type.body",
      "type.code",
      "motion.duration.fast",
      "motion.easing.out",
      "space.1",
    ]);
    expect([...built.themes.keys()]).toEqual(["day", "rose"]);
    expect(defaultTheme(built)).toBe("day");
    expect(built.themes.get("day")!.light.map((token) => token.path.join("."))).toEqual([
      "theme.day.light.color.text",
      "theme.day.light.color.page",
      "theme.day.light.color.veil",
      "theme.day.light.color.quote",
      "theme.day.light.shadow.pop",
    ]);
    const relative = (tokens: readonly { path: readonly string[] }[]) => tokens.map((token) => token.path.slice(3).join("."));
    for (const theme of ["day", "rose"]) {
      for (const mode of ["light", "dark"] as const) {
        expect(relative(built.themes.get(theme)![mode])).toEqual(relative(built.themes.get("day")!.light));
      }
    }
  });

  it("emits every theme and mode in the order of the default theme's light mode", () => {
    const json = fixture();
    const groups = modeOf(json, "rose", "dark");
    const { page, ...rest } = groups.color!;
    groups.color = { ...rest, page };
    expect(design(json).themes.get("rose")!.dark.map((token) => token.path.join("."))).toEqual([
      "theme.rose.dark.color.text",
      "theme.rose.dark.color.page",
      "theme.rose.dark.color.veil",
      "theme.rose.dark.color.quote",
      "theme.rose.dark.shadow.pop",
    ]);
  });

  it("requires every theme and mode to hold the same tokens with the same types", () => {
    const json = fixture();
    delete modeOf(json, "rose", "dark").color!.page;
    modeOf(json, "day", "dark").color!.extra = { $value: "{palette.night}" };
    modeOf(json, "rose", "light").shadow!.pop = { $type: "color", $value: "{palette.night}" };
    expect(problemsOf(json)).toEqual([
      "theme.day.dark.color.extra: not in theme.day.light; every theme and mode holds the same tokens",
      "theme.rose.light.shadow.pop: is a color token, but theme.day.light.shadow.pop is a shadow",
      "theme.rose.dark.color.page: missing; every theme and mode needs the tokens of theme.day.light",
    ]);
  });

  it("requires theme tokens at theme.<name>.<mode>, under a name that starts with a letter", () => {
    const json = fixture();
    const themes = json.theme as Record<string, unknown>;
    themes.dusk = { evening: themeMode("moon", "night", "theme.dusk.evening") };
    themes["2tone"] = both("2tone", "ink");
    const problems = problemsOf(json);
    expect(problems).toContain("theme.dusk.evening.color.text: a theme token must sit at theme.<name>.<light|dark>.<group>.…");
    expect(problems).toContain("theme.2tone: a theme name must start with a letter");
  });

  it("requires at least one theme", () => {
    const json = fixture();
    delete json.theme;
    expect(problemsOf(json)).toEqual(["no themes: the theme group needs at least one theme with light and dark tokens"]);
  });

  it("keeps aliases in scope", () => {
    const json = fixture();
    modeOf(json, "rose", "light").color!.quote = { $value: "{theme.day.light.color.text}" };
    modeOf(json, "rose", "dark").color!.quote = { $value: "{theme.rose.light.color.text}" };
    (json.space as Record<string, unknown>)["2"] = { $type: "color", $value: "{theme.day.light.color.text}" };
    (json.palette as Record<string, unknown>).pale = { $value: "{theme.day.light.color.page}" };
    expect(problemsOf(json)).toEqual([
      "palette.pale: a primitive token cannot alias {theme.day.light.color.page}",
      "theme.rose.light.color.quote: a rose light token cannot alias {theme.day.light.color.text}",
      "theme.rose.dark.color.quote: a rose dark token cannot alias {theme.rose.light.color.text}",
      "space.2: a global token cannot alias {theme.day.light.color.text}",
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

  it("rejects a theme whose Dart name a token or the generated code already uses", () => {
    const json = fixture();
    const themes = json.theme as Record<string, unknown>;
    themes.space1 = both("space1", "ink");
    themes.themes = both("themes", "ink");
    expect(problemsOf(json)).toEqual([
      "theme.space1: its Dart name space1 is also space.1's",
      "theme.themes: themes is not a usable Dart identifier",
    ]);
  });
});

describe("emitCss", () => {
  const css = emitCss(design());
  /** The text of the rule that starts at `start`, up to and including its last declaration's line. */
  const blockAfter = (start: string) => css.slice(css.indexOf(start), css.indexOf("\n}\n", css.indexOf(start)) + 1);

  it("puts global tokens on the root", () => {
    const root = blockAfter(":where(:root) {");
    expect(root).toContain('  --nl-font-family-sans: -apple-system, "Segoe UI", sans-serif;\n');
    expect(root).toContain("  --nl-space-1: 4px;\n");
  });

  it("gives the default theme's light mode to the root and to data-theme", () => {
    const light = blockAfter("/* The day theme, the default: light. */");
    expect(light).toContain(':where(:root), :where([data-theme="day"]) {\n  color-scheme: light;\n');
    expect(light).toContain("  /* Body text. */\n  --nl-color-text: #211d1a;\n");
  });

  it("applies dark by the system's preference unless a mode is chosen, and by data-mode", () => {
    expect(css).toContain(
      '@media (prefers-color-scheme: dark) {\n  :where(:root:not([data-mode])), :where([data-theme="day"]:not([data-mode])) {\n    color-scheme: dark;\n    --nl-color-text: #ece9e5;\n',
    );
    expect(css).toContain(
      ':where(:root[data-mode="dark"]), :where([data-theme="day"][data-mode="dark"]) {\n  color-scheme: dark;\n  --nl-color-text: #ece9e5;\n',
    );
  });

  it("gives other themes to data-theme only, never to the bare root", () => {
    expect(css).toContain(':where([data-theme="rose"]) {\n  color-scheme: light;\n  --nl-color-text: #a43066;\n');
    expect(css).toContain(':where([data-theme="rose"]:not([data-mode])) {\n');
    expect(css).toContain(':where([data-theme="rose"][data-mode="dark"]) {\n');
    expect(css).not.toMatch(/:root[^{]*rose/);
  });

  it("orders the rules so that the later, more specific choice wins", () => {
    // Every rule has zero specificity, so order decides: the default theme
    // before the others, and in each theme light before dark.
    const at = (text: string) => css.indexOf(text);
    expect(at(':where(:root), :where([data-theme="day"])')).toBeLessThan(at(':where(:root:not([data-mode]))'));
    expect(at(':where(:root:not([data-mode]))')).toBeLessThan(at(':where(:root[data-mode="dark"])'));
    expect(at(':where(:root[data-mode="dark"])')).toBeLessThan(at(':where([data-theme="rose"]) {'));
    expect(at(':where([data-theme="rose"]) {')).toBeLessThan(at(':where([data-theme="rose"][data-mode="dark"])'));
    expect(css).not.toMatch(/^(?!@media|\s|\/\*|\}|:where\()[^\n]*\{$/m);
  });

  it("writes descriptions once, in the default theme's light mode", () => {
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

  it("stops interface motion when reduced motion is on, whatever a theme sets", () => {
    expect(css).toContain(
      "@media (prefers-reduced-motion: reduce) {\n  :root {\n    --nl-motion-duration-fast: 0ms !important;\n  }\n}\n",
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
    expect(ts).toContain('  day: {\n    light: {\n      color: {\n        /** Body text. */\n        text: "#211d1a",\n');
    expect(ts).toContain('    dark: {\n      color: {\n        text: "#ece9e5",\n');
    expect(ts).toContain('  rose: {\n    light: {\n      color: {\n        text: "#a43066",\n');
    expect(ts).toContain('        quote: "#ece9e5",\n');
    expect(ts).toContain('        pop: "0px 2px 8px 0px rgb(0 0 0 / 0.1)",\n');
  });

  it("names the themes, the modes, and the default", () => {
    expect(ts).toContain("export type ThemeName = keyof typeof themes;\n");
    expect(ts).toContain("export type Mode = keyof (typeof themes)[ThemeName];\n");
    expect(ts).toContain('export const defaultTheme: ThemeName = "day";\n');
  });
});

describe("emitDart", () => {
  const dart = emitDart(design());

  it("switches the formatter off for the generated file", () => {
    expect(dart).toContain("// dart format off\n");
  });

  it("makes theme tokens fields of NlThemeTokens, with one NlColorTheme per theme", () => {
    expect(dart).toContain("  /// Body text.\n  final Color colorText;\n");
    expect(dart).toContain(
      "  static const NlColorTheme day = NlColorTheme(\n    name: 'day',\n    light: NlThemeTokens(\n      colorText: Color(0xFF211D1A),\n",
    );
    expect(dart).toContain("    dark: NlThemeTokens(\n      colorText: Color(0xFFECE9E5),\n");
    expect(dart).toContain("  static const NlColorTheme rose = NlColorTheme(\n    name: 'rose',\n");
    expect(dart).toContain("  static const List<NlColorTheme> themes = <NlColorTheme>[day, rose];\n");
    expect(dart).toContain("      colorVeil: Color(0x0D211D1A),\n");
    expect(dart).toContain(
      "      shadowPop: [\n        BoxShadow(color: Color(0x1A000000), offset: Offset(0, 2), blurRadius: 8),\n      ],\n",
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
    for (const theme of ["day", "rose"]) {
      for (const mode of ["light", "dark"]) {
        const pop = modeOf(inset, theme, mode).shadow!.pop as { $value: Array<Record<string, unknown>> };
        pop.$value[0]!.inset = true;
      }
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
