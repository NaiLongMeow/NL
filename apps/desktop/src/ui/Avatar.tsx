/**
 * The character's avatar: for now the default ball (UI design note, section
 * 10), a small flat ball in light sea blue with two upright bars for eyes,
 * drawn in the `character` tokens, which are the same in every theme. It
 * blinks now and then and moves like soft jelly. An avatar the user chooses,
 * or a character pack, replaces it later.
 *
 * `cue` is the state of the live character:
 *
 * - none: the avatar only blinks, as beside past messages;
 * - "idle": a soft jelly wobble now and then;
 * - "working": it hops while the character thinks or works;
 * - "listening": a steady ring in the reserved "microphone on" hue
 *   (product rule 8).
 *
 * With reduced motion the ball keeps still and only blinks, and a still ring
 * in the theme's accent stands in for the hops (Avatar.module.css).
 */

import { useId, type CSSProperties } from "react";
import styles from "./Avatar.module.css";

export type AvatarCue = "idle" | "working" | "listening";

/** How far apart, in seconds, avatars on one page may blink, so that a column of them never blinks at once. */
const BLINK_SPREAD = 5;

export function Avatar({ size, cue, label }: { size: number; cue?: AvatarCue; label?: string }) {
  const id = useId();
  // Each avatar on the page needs its own clip id; React's ids hold
  // characters that a `url(#…)` reference does not take everywhere.
  const clip = `nl-avatar-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const phase = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % (BLINK_SPREAD * 10);
  const style = { width: size, height: size, "--blink-delay": `${-phase / 10}s` } as CSSProperties;
  return (
    <span
      className={styles.avatar}
      data-cue={cue}
      style={style}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <defs>
          <clipPath id={clip}>
            <circle cx="32" cy="34" r="27" />
          </clipPath>
        </defs>
        <g className={styles.ball}>
          <circle className={styles.shade} cx="32" cy="34" r="27" />
          {/* Flat shading: the lit body, set up and to the left inside the ball, leaves a crescent of shade. */}
          <circle className={styles.body} cx="29.5" cy="31" r="27" clipPath={`url(#${clip})`} />
          <g className={styles.eyes}>
            <rect className={styles.eye} x="22.5" y="31.5" width="5" height="11" rx="2.5" />
            <rect className={styles.eye} x="36.5" y="31.5" width="5" height="11" rx="2.5" />
          </g>
        </g>
      </svg>
    </span>
  );
}
