/**
 * What every rendition of an avatar offers the window that shows it: the
 * character's cues (UI design note, section 10) in, nothing out. The names
 * come from the avatar pack format (skills/nl-avatar/references/format.md);
 * each rendition maps them to its own art, falling back as the format says
 * when a pack has nothing for one.
 */

import type { Expression, Gesture, Pointer, State } from "@nl/avatar-skill/format";

export type { Expression, Gesture, Pointer, State };

export interface AvatarView {
  /** What the character is doing. */
  setState(state: State): void;
  /** The expression of the message being shown, or null when there is none. */
  setExpression(expression: Expression | null): void;
  /** Plays a gesture once. */
  playGesture(gesture: Gesture): void;
  /** What the user's pointer is doing to the avatar, or null when nothing. */
  setPointer(pointer: Pointer | null): void;
  /**
   * Where the pointer is, from -1 (left, bottom) to 1 (right, top) of the
   * window, or null when it has left; renditions that can look at it do.
   */
  lookAt(point: { x: number; y: number } | null): void;
  /** Stops all timers and drawing and removes what the rendition added to the page. */
  destroy(): void;
}

/** Timers, so that tests can drive time themselves. */
export interface Timers {
  setTimeout(callback: () => void, ms: number): number;
  clearTimeout(handle: number): void;
}

export const browserTimers: Timers = {
  setTimeout: (callback, ms) => window.setTimeout(callback, ms),
  clearTimeout: (handle) => window.clearTimeout(handle),
};
