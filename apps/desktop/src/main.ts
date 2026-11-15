/** Main window: for now only shows the character above a status line. */

import { mountStage } from "@nl/stage";

const canvas = document.querySelector<HTMLCanvasElement>("#stage");
if (canvas) mountStage(canvas);
