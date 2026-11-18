import { describe, expect, it } from "vitest";
import { themes } from "@nl/tokens";
import { localeFor, storedLocale } from "./I18n";
import { en, zhCN } from "./messages";

/** Every leaf of a catalog: strings, and functions called with sample arguments. */
function leaves(catalog: object, path = ""): Array<[string, string]> {
  return Object.entries(catalog).flatMap(([key, value]): Array<[string, string]> => {
    const at = path ? `${path}.${key}` : key;
    if (typeof value === "string") return [[at, value]];
    if (typeof value === "function") return [[at, String(value("x", "y", "z"))]];
    return leaves(value as object, at);
  });
}

describe("messages", () => {
  it("has the same entries in English and Chinese", () => {
    expect(leaves(zhCN).map(([path]) => path)).toEqual(leaves(en).map(([path]) => path));
  });

  it("leaves no text empty in either language", () => {
    for (const [path, text] of [...leaves(en), ...leaves(zhCN)]) expect(text.trim(), path).not.toBe("");
  });

  it("names every built-in theme, and nothing else, in both languages", () => {
    for (const catalog of [en, zhCN]) expect(Object.keys(catalog.settings.themes)).toEqual(Object.keys(themes));
  });

  it("reads back only a locale it knows", () => {
    const storage = (value: string | null) => ({ getItem: () => value });
    expect(storedLocale(storage("zh-CN"))).toBe("zh-CN");
    expect(storedLocale(storage("en"))).toBe("en");
    expect(storedLocale(storage("fr"))).toBeUndefined();
    expect(storedLocale(storage(null))).toBeUndefined();
  });

  it("picks Chinese for any zh system language and English otherwise", () => {
    expect(localeFor("zh-CN")).toBe("zh-CN");
    expect(localeFor("zh-Hant-TW")).toBe("zh-CN");
    expect(localeFor("en-US")).toBe("en");
    expect(localeFor("ja")).toBe("en");
    expect(localeFor(undefined)).toBe("en");
  });
});
