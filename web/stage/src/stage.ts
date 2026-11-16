/**
 * Draws the character onto a canvas.
 *
 * The avatar runtime will come from an asset pack (see docs/architecture.md,
 * "角色形象与素材包"); until one is wired in, a placeholder character is drawn
 * so that windows embedding the stage can be checked end to end.
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
  context.fillStyle = "#5a3a00";
  context.font = `700 ${Math.round(radius * 0.6)}px system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("NL", x + radius, y + radius);
}

/**
 * Renders the character into `canvas` and keeps it fitted when the window is
 * resized. Returns a function that stops the resize handling.
 */
export function mountStage(canvas: HTMLCanvasElement): () => void {
  const redraw = () => draw(canvas);
  redraw();
  window.addEventListener("resize", redraw);
  return () => window.removeEventListener("resize", redraw);
}
