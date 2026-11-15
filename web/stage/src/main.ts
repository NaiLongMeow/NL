/**
 * Stage entry point.
 *
 * Loaded inside a webview by the desktop pet (wry) and the mobile app
 * (webview_flutter). It will host the avatar runtime from an asset pack (see
 * docs/architecture.md, "角色形象与素材包"); until a runtime is wired in, it
 * draws a placeholder character so the transparent window can be checked.
 */

import { fitModel } from "./framing";

/** Size of the placeholder "model" in model units. */
const PLACEHOLDER = { width: 100, height: 100 };

function draw(canvas: HTMLCanvasElement): void {
  // Render at device resolution so the character stays sharp on HiDPI screens.
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(canvas.clientWidth * ratio);
  canvas.height = Math.round(canvas.clientHeight * ratio);

  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);

  const { scale, x, y } = fitModel(
    { width: canvas.width, height: canvas.height },
    PLACEHOLDER,
    16 * ratio,
  );
  if (scale === 0) return;

  const radius = (PLACEHOLDER.width * scale) / 2;
  context.fillStyle = "#f5a623";
  context.beginPath();
  context.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
  context.fill();
}

const canvas = document.querySelector<HTMLCanvasElement>("#stage");
if (canvas) {
  draw(canvas);
  window.addEventListener("resize", () => draw(canvas));
}
