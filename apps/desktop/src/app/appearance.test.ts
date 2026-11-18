import { afterEach, describe, expect, it } from "vitest";
import { themes } from "@nl/tokens";
import {
  APPEARANCE_KEY,
  CUSTOM_STYLE_ID,
  DEFAULT_APPEARANCE,
  THEME_NAMES,
  applyAppearance,
  applyCustomCss,
  loadAppearance,
  parseAppearance,
  pixelHex,
  resolveMode,
  saveAppearance,
} from "./appearance";

describe("parseAppearance", () => {
  it("reads a stored appearance", () => {
    expect(parseAppearance('{"theme":"sakura","mode":"dark","custom":"ocean.css"}')).toEqual({
      theme: "sakura",
      mode: "dark",
      custom: "ocean.css",
    });
  });

  it("falls back field by field, so a removed theme resets only the theme", () => {
    expect(parseAppearance('{"theme":"neon","mode":"dark","custom":""}')).toEqual({
      theme: DEFAULT_APPEARANCE.theme,
      mode: "dark",
      custom: null,
    });
    expect(parseAppearance('{"mode":"sepia"}')).toEqual(DEFAULT_APPEARANCE);
  });

  it("treats anything that is not an object as nothing stored", () => {
    for (const raw of [null, undefined, "", "not json", "42", "null", '"sea"']) {
      expect(parseAppearance(raw)).toEqual(DEFAULT_APPEARANCE);
    }
  });

  it("starts with the default theme, following the system", () => {
    expect(DEFAULT_APPEARANCE).toEqual({ theme: "sea", mode: "system", custom: null });
    expect(THEME_NAMES).toEqual(Object.keys(themes));
  });

  it("round-trips through storage", () => {
    const store = new Map<string, string>();
    const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value) };
    saveAppearance({ theme: "matcha", mode: "light", custom: null }, storage);
    expect(store.has(APPEARANCE_KEY)).toBe(true);
    expect(loadAppearance(storage)).toEqual({ theme: "matcha", mode: "light", custom: null });
  });
});

describe("resolveMode", () => {
  it("uses the choice, or the system's preference for System", () => {
    expect(resolveMode("light", true)).toBe("light");
    expect(resolveMode("dark", false)).toBe("dark");
    expect(resolveMode("system", true)).toBe("dark");
    expect(resolveMode("system", false)).toBe("light");
  });
});

describe("applying an appearance", () => {
  afterEach(() => {
    document.getElementById(CUSTOM_STYLE_ID)?.remove();
  });

  it("sets the theme and the mode in use on the root element", () => {
    const root = document.createElement("html");
    applyAppearance(root, "lavender", "dark");
    expect(root.dataset).toMatchObject({ theme: "lavender", mode: "dark" });
  });

  it("adds a custom theme after every other style sheet, as text, and removes it again", () => {
    const earlier = document.createElement("style");
    document.head.append(earlier);
    applyCustomCss(document, ":root { --nl-color-accent-fill: #ff5fa2; } </style><script>alert(1)</script>");
    const style = document.getElementById(CUSTOM_STYLE_ID)!;
    expect(document.head.lastElementChild).toBe(style);
    expect(style.children).toHaveLength(0);
    expect(style.textContent).toContain("</style><script>");
    expect(document.querySelector("script")).toBeNull();

    // A later style sheet does not push it back.
    document.head.append(document.createElement("style"));
    applyCustomCss(document, ":root {}");
    expect(document.head.lastElementChild).toBe(style);
    expect(document.querySelectorAll(`#${CUSTOM_STYLE_ID}`)).toHaveLength(1);

    applyCustomCss(document, null);
    expect(document.getElementById(CUSTOM_STYLE_ID)).toBeNull();
    earlier.remove();
  });
});

describe("pixelHex", () => {
  it("passes an opaque pixel on as #rrggbb", () => {
    expect(pixelHex(new Uint8ClampedArray([250, 252, 254, 255]))).toBe("#fafcfe");
    expect(pixelHex([0, 0, 0, 255])).toBe("#000000");
    expect(pixelHex([255, 255, 255, 255])).toBe("#ffffff");
  });

  it("gives null for a translucent pixel, so the system's caption color applies", () => {
    expect(pixelHex([21, 26, 31, 254])).toBeNull();
    expect(pixelHex(new Uint8ClampedArray(4))).toBeNull();
  });
});
