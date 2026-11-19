/**
 * Pet window entry: renders the pet into #pet (pet.html), in the user's
 * theme, light or dark, and language, kept on this device and shared with
 * the main window.
 */

import "@nl/tokens/tokens.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { applyAppearance, loadAppearance, resolveMode } from "../app/appearance";
import { guardContextMenu } from "../app/webview";
import { I18nProvider } from "../i18n/I18n";
import { PetWindow } from "./PetWindow";

// The ball's still ring for reduced motion uses the theme's accent.
const appearance = loadAppearance();
applyAppearance(document.documentElement, appearance.theme, resolveMode(appearance.mode, matchMedia("(prefers-color-scheme: dark)").matches));

// Release builds have no context menu on the pet; development builds keep it, for Inspect.
if (import.meta.env.PROD) guardContextMenu();

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
