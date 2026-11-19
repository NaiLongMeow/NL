/**
 * Keeps the webview's context menu where a window has one (UI design note,
 * section 5, "A window, not a browser").
 *
 * WebView2's menu offers Back, Reload, Save as, Print, and, in development
 * builds, Inspect. The page keeps it only in text fields, where Cut, Copy,
 * and Paste belong, and on selected text, which can be copied; anywhere else
 * a right-click does nothing until the app has a menu of its own there.
 * WebView2 can only turn the menu off everywhere, so this is decided in the
 * page. The browser's keys are turned off natively (src-tauri/src/webview.rs).
 *
 * *(user, 2026-11-19)* Development builds behave the same, unless started
 * with `NL_DEV_BROWSER_KEYS=1`, which keeps the menu everywhere, for
 * Inspect, as well as the browser's keys.
 */

/** Whether this page keeps the browser's menu and keys: a development build started with NL_DEV_BROWSER_KEYS=1 (vite.config.ts). */
export const keepsBrowserKeys: boolean = import.meta.env.DEV && __NL_DEV_BROWSER_KEYS__;

/** Input types that hold text the user can cut, copy, and paste. */
const TEXT_INPUTS: ReadonlySet<string> = new Set(["text", "search", "email", "url", "tel", "password", "number"]);

/** Whether `target` is a field the user types in. */
export function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const field = target.closest("input, textarea, [contenteditable]");
  if (field instanceof HTMLInputElement) return TEXT_INPUTS.has(field.type);
  if (field instanceof HTMLTextAreaElement) return true;
  // The nearest element that says whether it is editable decides.
  return field instanceof HTMLElement && field.getAttribute("contenteditable") !== "false";
}

/** Whether a right-click on `target`, with `selection` selected, keeps the webview's menu. */
export function keepsContextMenu(target: EventTarget | null, selection: string): boolean {
  return isTextField(target) || selection.trim().length > 0;
}

/** Suppresses the context menu outside text fields and selections; returns a function that undoes it. */
export function guardContextMenu(doc: Document = document): () => void {
  const listener = (event: MouseEvent) => {
    if (!keepsContextMenu(event.target, doc.getSelection()?.toString() ?? "")) event.preventDefault();
  };
  doc.addEventListener("contextmenu", listener);
  return () => doc.removeEventListener("contextmenu", listener);
}
