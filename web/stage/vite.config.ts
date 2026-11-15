import { defineConfig } from "vite";

// The stage is loaded from local files by webviews (wry on desktop,
// webview_flutter on mobile), never from a web server, so asset URLs must be
// relative and the bundle must target the oldest webview engines we support.
export default defineConfig({
  base: "./",
  build: {
    // Safari 16 is the WKWebView baseline for the iOS versions NL supports.
    target: ["es2022", "safari16"],
    // Production bundles ship without source maps to stay small.
    sourcemap: false,
    // Skipping gzip size reporting speeds up builds; webviews load from disk.
    reportCompressedSize: false,
  },
});
