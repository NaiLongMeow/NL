/** Main window entry: renders the app into #root (index.html). */

import "@nl/tokens/tokens.css";
import "./app/global.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { guardContextMenu } from "./app/webview";

// Release builds keep the webview's context menu to text fields and
// selections; development builds keep it everywhere, for Inspect.
if (import.meta.env.PROD) guardContextMenu();

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
