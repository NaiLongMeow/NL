/**
 * The window's appearance (UI design note, sections 3 and 11): the color
 * theme, light or dark, and an optional custom theme on top.
 *
 * The choice is kept in local storage on this device (section 13). It
 * reaches the page as two attributes on the root element, which the
 * generated token rules read (@nl/tokens/tokens.css):
 *
 * - `data-theme`: the built-in theme, such as "sea";
 * - `data-mode`: "light" or "dark", always set to the mode actually in use,
 *   so that "System" follows the system's preference through the media
 *   query here, and a custom theme only ever needs `:root[data-mode="dark"]`
 *   for its dark values.
 *
 * A custom theme is CSS text applied in a `<style>` element at the end of
 * the head, after the generated tokens. The generated rules have zero
 * specificity, so its ordinary selectors win.
 */

import { useCallback, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { defaultTheme, themes, type Mode, type ThemeName } from "@nl/tokens";

export type ModeChoice = "system" | Mode;

export interface Appearance {
  theme: ThemeName;
  mode: ModeChoice;
  /** The file name of the custom theme applied on top, or null for none. */
  custom: string | null;
}

/** Where the appearance is kept. */
export const APPEARANCE_KEY = "nl.appearance";

/** The built-in themes, the default first. */
export const THEME_NAMES = Object.keys(themes) as ThemeName[];

export const DEFAULT_APPEARANCE: Appearance = { theme: defaultTheme, mode: "system", custom: null };

const MODE_CHOICES: readonly ModeChoice[] = ["system", "light", "dark"];

/**
 * Reads a stored appearance. Stored text is untrusted (T6): each field that
 * is missing or unknown falls back to its default on its own, so that a
 * theme removed in a later release resets only the theme.
 */
export function parseAppearance(raw: string | null | undefined): Appearance {
  let value: unknown;
  try {
    value = JSON.parse(raw ?? "null");
  } catch {
    return DEFAULT_APPEARANCE;
  }
  if (typeof value !== "object" || value === null) return DEFAULT_APPEARANCE;
  const { theme, mode, custom } = value as Record<string, unknown>;
  return {
    theme: THEME_NAMES.includes(theme as ThemeName) ? (theme as ThemeName) : DEFAULT_APPEARANCE.theme,
    mode: MODE_CHOICES.includes(mode as ModeChoice) ? (mode as ModeChoice) : DEFAULT_APPEARANCE.mode,
    custom: typeof custom === "string" && custom.length > 0 ? custom : null,
  };
}

export function loadAppearance(storage: Pick<Storage, "getItem"> | undefined = globalThis.localStorage): Appearance {
  return parseAppearance(storage?.getItem(APPEARANCE_KEY));
}

export function saveAppearance(appearance: Appearance, storage: Pick<Storage, "setItem"> | undefined = globalThis.localStorage) {
  storage?.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
}

/** The mode in use: the choice, or the system's preference for "system". */
export function resolveMode(choice: ModeChoice, systemPrefersDark: boolean): Mode {
  if (choice !== "system") return choice;
  return systemPrefersDark ? "dark" : "light";
}

/** Sets the attributes the token rules read (see the module comment). */
export function applyAppearance(root: HTMLElement, theme: ThemeName, mode: Mode) {
  root.dataset.theme = theme;
  root.dataset.mode = mode;
}

export const CUSTOM_STYLE_ID = "nl-custom-theme";

/**
 * Applies a custom theme's CSS after every other style sheet, or removes it
 * when `css` is null. The text goes in as text, never as markup.
 */
export function applyCustomCss(doc: Document, css: string | null) {
  let style = doc.getElementById(CUSTOM_STYLE_ID);
  if (css === null) {
    style?.remove();
    return;
  }
  if (!style) {
    style = doc.createElement("style");
    style.id = CUSTOM_STYLE_ID;
  }
  style.textContent = css;
  // Last in the head, so that it follows style sheets added after it.
  doc.head.append(style);
}

/**
 * A canvas pixel, its red, green, blue, and alpha bytes, as `#rrggbb` for the
 * native caption behind the title bar's buttons, which takes an opaque color
 * only. A translucent pixel gives null, which leaves the system's own
 * caption color.
 */
export function pixelHex([red = 0, green = 0, blue = 0, alpha = 0]: Iterable<number>): string | null {
  if (alpha !== 255) return null;
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeToSystemMode(onChange: () => void) {
  const query = globalThis.matchMedia?.(DARK_QUERY);
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
}

function systemPrefersDark() {
  return globalThis.matchMedia?.(DARK_QUERY).matches ?? false;
}

/**
 * The appearance with its setter, kept in storage and applied to the root
 * element, and the mode in use. "System" follows the system's preference as
 * it changes.
 */
export function useAppearance(): { appearance: Appearance; mode: Mode; setAppearance: (next: Appearance) => void } {
  const [appearance, setState] = useState(loadAppearance);
  const prefersDark = useSyncExternalStore(subscribeToSystemMode, systemPrefersDark);
  const mode = resolveMode(appearance.mode, prefersDark);
  // Before paint, so that a change never flashes the old colors.
  useLayoutEffect(() => applyAppearance(document.documentElement, appearance.theme, mode), [appearance.theme, mode]);
  const setAppearance = useCallback((next: Appearance) => {
    saveAppearance(next);
    setState(next);
  }, []);
  return { appearance, mode, setAppearance };
}
