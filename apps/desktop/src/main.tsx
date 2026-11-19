/** Main window entry: renders the app into #root (index.html). */

import "@nl/tokens/tokens.css";
import "./app/global.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { guardContextMenu, keepsBrowserKeys } from "./app/webview";

// The webview's context menu stays in text fields and selections, unless a
// development build keeps the browser's menu and keys (app/webview.ts).
if (!keepsBrowserKeys) guardContextMenu();

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
