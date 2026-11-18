/**
 * The character's avatar: for now the placeholder character, a round body
 * with two eyes (UI design note, section 10), drawn in the character's
 * tokens. A character pack replaces it with its own art in Stage 6.
 *
 * `cue` shows the character's state around the avatar: a soft pulse of the
 * accent while it thinks or works, and a steady ring in the reserved
 * "microphone on" hue while it listens (product rule 8).
 */

import styles from "./Avatar.module.css";

export type AvatarCue = "idle" | "working" | "listening";

export function Avatar({ size, cue = "idle", label }: { size: number; cue?: AvatarCue; label?: string }) {
  return (
    <span
      className={styles.avatar}
      data-cue={cue}
      style={{ width: size, height: size }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg viewBox="0 0 40 40" width={size} height={size}>
        <circle className={styles.body} cx="20" cy="21" r="17" />
        <rect className={styles.eye} x="12.6" y="14" width="4.4" height="8" rx="2.2" />
        <rect className={styles.eye} x="23" y="14" width="4.4" height="8" rx="2.2" />
      </svg>
    </span>
  );
}
