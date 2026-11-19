/**
 * Pet window entry: renders the pet into #pet (pet.html), in the user's
 * theme, light or dark, and language, kept on this device and shared with
 * the main window.
 */

import "@nl/tokens/tokens.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { applyAppearance, loadAppearance, resolveMode } from "../app/appearance";
import { guardContextMenu, keepsBrowserKeys } from "../app/webview";
import { I18nProvider } from "../i18n/I18n";
import { PetWindow } from "./PetWindow";

// The ball's still ring for reduced motion uses the theme's accent.
const appearance = loadAppearance();
applyAppearance(document.documentElement, appearance.theme, resolveMode(appearance.mode, matchMedia("(prefers-color-scheme: dark)").matches));

// The webview's context menu stays in text fields and selections, unless a
// development build keeps the browser's menu and keys (app/webview.ts). On
// the pet itself a right click always opens the pet's own menu (PetWindow).
if (!keepsBrowserKeys) guardContextMenu();

const root = document.getElementById("pet");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <I18nProvider>
        <PetWindow />
      </I18nProvider>
    </StrictMode>,
  );
}
