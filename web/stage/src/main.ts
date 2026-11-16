/**
 * Standalone stage page, loaded by the mobile app's webview (and by `pnpm dev`
 * when working on the renderer alone).
 */

import { mountStage } from "./index";

const canvas = document.querySelector<HTMLCanvasElement>("#stage");
if (canvas) mountStage(canvas);
