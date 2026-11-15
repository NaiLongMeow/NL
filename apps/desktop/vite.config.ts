import { resolve } from "node:path";
import { defineConfig } from "vite";

// Frontend of the Tauri desktop app. Each window is its own page, so the build
// has one entry per window (labels and URLs in src-tauri/tauri.conf.json).
export default defineConfig({
  base: "./",
  // Tauri prints its own logs; keep Vite from clearing them in `tauri dev`.
  clearScreen: false,
  server: {
    // Must match build.devUrl in tauri.conf.json; fail instead of moving to
    // another port, which Tauri would not find.
    port: 1420,
    strictPort: true,
  },
  build: {
    // WebView2 (Windows) is Chromium 105+; WKWebView (macOS) is Safari 16+.
    target: ["es2022", "chrome105", "safari16"],
    sourcemap: false,
    reportCompressedSize: false,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        pet: resolve(import.meta.dirname, "pet.html"),
      },
    },
  },
});
