/**
 * Desktop pet window: draws the character and lets the user move it by
 * dragging and close it with a double-click.
 */

import { getCurrentWindow } from "@tauri-apps/api/window";
import { mountStage } from "@nl/stage";
import { type Point, shouldStartDrag } from "./drag";

const canvas = document.querySelector<HTMLCanvasElement>("#stage");
if (canvas) {
  mountStage(canvas);

  const pet = getCurrentWindow();
  let pressedAt: Point | null = null;

  canvas.addEventListener("mousedown", (event) => {
    if (event.button === 0) pressedAt = { x: event.screenX, y: event.screenY };
  });
  window.addEventListener("mouseup", () => {
    pressedAt = null;
  });
  window.addEventListener("mousemove", (event) => {
    if (!pressedAt || (event.buttons & 1) === 0) return;
    if (shouldStartDrag(pressedAt, { x: event.screenX, y: event.screenY })) {
      pressedAt = null;
      void pet.startDragging();
    }
  });
  canvas.addEventListener("dblclick", () => {
    void pet.close();
  });
}
