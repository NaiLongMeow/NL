/**
 * Deciding when a press on the pet turns into a window drag.
 *
 * Dragging hands the mouse to the operating system's window-move loop, which
 * swallows the following clicks. Starting it on mousedown would therefore make
 * double-clicks impossible, so a drag only starts once the pointer has moved a
 * few pixels with the button held.
 */

export interface Point {
  x: number;
  y: number;
}

/** Distance in CSS pixels the pointer must travel before a drag starts. */
export const DRAG_THRESHOLD = 4;

/** Whether moving from `start` to `current` should start a window drag. */
export function shouldStartDrag(start: Point, current: Point, threshold = DRAG_THRESHOLD): boolean {
  return Math.hypot(current.x - start.x, current.y - start.y) >= threshold;
}
