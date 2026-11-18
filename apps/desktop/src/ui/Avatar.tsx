/**
 * The character's avatar: for now the placeholder character (UI design note,
 * section 10), a soft round body in light sea blue with a small water spout,
 * dark eyes with a highlight, and pink cheeks, drawn in the `character`
 * tokens, which are the same in every theme. A character pack replaces it
 * with its own art in Stage 6.
 *
 * `cue` shows the character's state around the avatar: a soft pulse of the
 * theme's accent while it thinks or works, and a steady ring in the reserved
 * "microphone on" hue while it listens (product rule 8).
 */

import { useId } from "react";
import styles from "./Avatar.module.css";

export type AvatarCue = "idle" | "working" | "listening";

export function Avatar({ size, cue = "idle", label }: { size: number; cue?: AvatarCue; label?: string }) {
  // Each avatar on the page needs its own gradient id; React's ids hold
  // characters that a `url(#…)` reference does not take everywhere.
  const gradient = `nl-avatar-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <span
      className={styles.avatar}
      data-cue={cue}
      style={{ width: size, height: size }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.15" className={styles.bodyTop} />
            <stop offset="1" className={styles.bodyBottom} />
          </linearGradient>
        </defs>
        {/* The water spout: a droplet between two curls. */}
        <path className={styles.spout} d="M32 17c0-4.2-2.1-7.6-6.4-8.6 2 1.9 2.9 4.5 3 8.6z" />
        <path className={styles.spout} d="M32 17c0-4.2 2.1-7.6 6.4-8.6-2 1.9-2.9 4.5-3 8.6z" />
        <circle className={styles.spout} cx="32" cy="9.2" r="2.6" />
        {/* The body: round, a little wider than tall, flat underneath. */}
        <path
          className={styles.body}
          fill={`url(#${gradient})`}
          d="M32 15.5c14.6 0 26 10.2 26 23.4 0 11.6-10.2 18.6-26 18.6S6 50.5 6 38.9C6 25.7 17.4 15.5 32 15.5z"
        />
        <ellipse className={styles.shine} cx="21.5" cy="25.5" rx="7.5" ry="4" transform="rotate(-24 21.5 25.5)" />
        <ellipse className={styles.blush} cx="16.5" cy="43" rx="5" ry="3" />
        <ellipse className={styles.blush} cx="47.5" cy="43" rx="5" ry="3" />
        <g className={styles.eyes}>
          <ellipse className={styles.eye} cx="23" cy="37" rx="3.7" ry="4.7" />
          <ellipse className={styles.eye} cx="41" cy="37" rx="3.7" ry="4.7" />
          <circle className={styles.eyeLight} cx="24.4" cy="35.1" r="1.35" />
          <circle className={styles.eyeLight} cx="42.4" cy="35.1" r="1.35" />
        </g>
        <path className={styles.mouth} d="M29.4 43.6q2.6 2.4 5.2 0" />
      </svg>
    </span>
  );
}
