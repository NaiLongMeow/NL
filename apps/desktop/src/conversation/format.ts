/** Formatting shared by the conversation's blocks. */

import type { Messages } from "../i18n/messages";

/**
 * A duration as the rows show it: one decimal under ten seconds ("1.2 s"),
 * whole seconds under a minute ("42 s"), minutes and seconds above ("1:12").
 */
export function formatDuration(milliseconds: number, t: Messages): string {
  const seconds = milliseconds / 1000;
  if (seconds < 10) return t.time.seconds(Math.round(seconds * 10) / 10);
  if (seconds < 60) return t.time.seconds(Math.round(seconds));
  const whole = Math.round(seconds);
  return t.time.minutes(Math.floor(whole / 60), whole % 60);
}
