/**
 * What the main window asks of the desktop app's native side (src-tauri):
 * the custom theme files (themes.rs) and, on Windows, the title bar's insets
 * and the caption behind the system's buttons (titlebar.rs, caption.rs).
 *
 * The page also runs without a native side: the development server opened
 * in a browser, and the tests. There these report that there is nothing,
 * and change nothing.
 */

import { invoke, isTauri } from "@tauri-apps/api/core";
import type { Mode } from "@nl/tokens";
import { pixelHex } from "./appearance";
import { isWindows, setTitlebarColor, watchTitlebarInsets } from "./titlebar/titlebar.js";

export type CustomThemeProblem = "too-large" | "not-utf8" | "unreadable";

/** One file in the themes folder, as themes.rs lists it. */
export interface CustomTheme {
  file: string;
  name: string;
  /** The CSS text; null when the file was refused. */
  css: string | null;
  problem: CustomThemeProblem | null;
}

export interface CustomThemes {
  folder: string;
  themes: CustomTheme[];
}

/** Whether the page runs inside the desktop app. */
export function inDesktopApp(): boolean {
  return isTauri();
}

/** The custom themes and their folder, or null outside the desktop app. */
export async function customThemes(): Promise<CustomThemes | null> {
  return isTauri() ? invoke<CustomThemes>("custom_themes") : null;
}

export async function openCustomThemesFolder(): Promise<void> {
  if (isTauri()) await invoke("open_custom_themes_folder");
}

/** Keeps the title bar's CSS insets (`--titlebar-*`) in sync; returns a function that stops it. */
export function watchTitlebar(): () => void {
  return isTauri() ? watchTitlebarInsets() : () => {};
}

/**
 * How the strip behind the caption buttons follows the page (caption.rs):
 *
 * - "colored": DWM paints it in the title bar's color (Windows 11,
 *   measured on build 26300);
 * - "system": DWM refuses a caption color, so the title bar takes the
 *   system's caption color instead (TitleBar.module.css), and the caption
 *   turns dark with the page's mode;
 * - "none": not Windows, or not the desktop app.
 */
export type CaptionStyle = "colored" | "system" | "none";

let captionStyle: Promise<CaptionStyle> | undefined;

function detectCaptionStyle(): Promise<CaptionStyle> {
  if (!isTauri() || !isWindows) return Promise.resolve("none");
  captionStyle ??= invoke<boolean>("caption_color_supported").then(
    (colorable): CaptionStyle => (colorable ? "colored" : "system"),
    (): CaptionStyle => "none",
  );
  return captionStyle;
}

/**
 * The title bar's color, `--nl-color-surface-app`, as `#rrggbb`, or null when
 * it is translucent. The page resolves the property and a canvas converts
 * the color, so a custom theme may write any CSS color: `oklch()`,
 * `color-mix()`, `light-dark()`, or a named color.
 */
function titleBarColor(root: HTMLElement): string | null {
  const doc = root.ownerDocument;
  const context = doc.createElement("canvas").getContext("2d");
  if (!context) return null;
  const probe = doc.createElement("span");
  probe.hidden = true;
  probe.style.backgroundColor = "var(--nl-color-surface-app)";
  root.append(probe);
  context.fillStyle = getComputedStyle(probe).backgroundColor;
  probe.remove();
  context.fillRect(0, 0, 1, 1);
  return pixelHex(context.getImageData(0, 0, 1, 1).data);
}

/**
 * Matches the caption behind the buttons to the title bar, after the theme,
 * the mode, or a custom theme changed. Sets `data-caption` on `root` to the
 * caption style, which the title bar's CSS reads.
 */
export async function syncCaption(root: HTMLElement, mode: Mode): Promise<void> {
  const style = await detectCaptionStyle();
  root.dataset.caption = style;
  if (style === "colored") {
    await setTitlebarColor(titleBarColor(root));
  } else if (style === "system") {
    await invoke("set_caption_dark", { dark: mode === "dark" });
  }
}
