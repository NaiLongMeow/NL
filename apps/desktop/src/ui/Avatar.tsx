/**
 * The character's avatar: for now the default ball (UI design note, section
 * 10), a jelly-like ball in bright sea blue, flat and 2D, with a glossy
 * highlight, pink cheeks, and two white upright bars for eyes, drawn in the
 * `character` tokens, which are the same in every theme. An avatar the user
 * chooses, or a character pack, replaces it later.
 *
 * The ball is never still, and each state of the character looks different
 * (Avatar.module.css has the choreography):
 *
 * - "idle": it breathes, blinks with a squish, looks around and leans with
 *   its gaze, settles like jelly, smiles with ^ ^ eyes and a sparkle, and
 *   winks;
 * - "working": it hops without a pause, squinting as it lands;
 * - "approval": waiting for the user's OK, it bobs as if knocking, with
 *   hopeful wide eyes and a "!" bubble;
 * - "question": waiting for the user's answer, it tilts its head from side
 *   to side, one eye narrowed, with a swaying "?" bubble;
 * - "device": waiting for a device to come online, it dozes, eyes shut and
 *   dimmed, with a "z" bubble;
 * - "listening": wide eyes, small nods, and a steady ring in the reserved
 *   "microphone on" hue (product rule 8).
 *
 * Pointing at it squishes it, eyes shut tight, and it springs back. With
 * reduced motion it keeps still: the eyes, cheeks, and bubbles still show
 * the state, and a still ring in the theme's accent shows that it works.
 */

import { useId, type CSSProperties } from "react";
import styles from "./Avatar.module.css";

export type AvatarCue = "idle" | "working" | "approval" | "question" | "device" | "listening";

/**
 * How far apart, in seconds, avatars on one page start their loops (a
 * multiple of it for the longer ones), so that a column of them never moves
 * in step.
 */
const PHASE_SPREAD = 5;

export function Avatar({ size, cue = "idle", label }: { size: number; cue?: AvatarCue; label?: string }) {
  const id = useId();
  // Each avatar on the page needs its own clip id; React's ids hold
  // characters that a `url(#…)` reference does not take everywhere.
  const clip = `nl-avatar-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const phase = ([...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % (PHASE_SPREAD * 10)) / 10;
  const style = { width: size, height: size, "--phase": phase } as CSSProperties;
  return (
    <span
      className={styles.avatar}
      data-cue={cue}
      style={style}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg viewBox="0 0 40 40" width={size} height={size}>
        <defs>
          <clipPath id={clip}>
            <circle cx="20" cy="21" r="17" />
          </clipPath>
        </defs>
        {/* One kind of motion per layer, so that they add up: the state's movement, then breathing. */}
        <g className={styles.motion}>
          <g className={styles.breath}>
            <circle className={styles.rim} cx="20" cy="21" r="17" />
            {/* Flat shading: the lit body, set up and to the left inside the ball, leaves a darker rim. */}
            <circle className={styles.body} cx="18.6" cy="19.4" r="17" clipPath={`url(#${clip})`} />
            <ellipse className={styles.shine} cx="11.6" cy="11.2" rx="3.3" ry="1.8" transform="rotate(-40 11.6 11.2)" />
            <circle className={styles.shine} cx="15.7" cy="8.3" r="1.05" />
            <ellipse className={styles.cheek} cx="10.4" cy="24.6" rx="2.9" ry="1.7" />
            <ellipse className={styles.cheek} cx="29.6" cy="24.6" rx="2.9" ry="1.7" />
            <g className={styles.gaze}>
              <g className={styles.eyes}>
                <rect className={`${styles.open} ${styles.openLeft}`} x="12" y="13" width="5" height="9.5" rx="2.5" />
                <rect className={`${styles.open} ${styles.openRight}`} x="23" y="13" width="5" height="9.5" rx="2.5" />
                <path className={`${styles.happy} ${styles.happyLeft}`} d="M11.6 19.6Q14.5 14.4 17.4 19.6" />
                <path className={`${styles.happy} ${styles.happyRight}`} d="M22.6 19.6Q25.5 14.4 28.4 19.6" />
                <path className={styles.squint} d="M12.4 14.6L16.6 17.75L12.4 20.9" />
                <path className={styles.squint} d="M27.6 14.6L23.4 17.75L27.6 20.9" />
              </g>
            </g>
            <path className={styles.sparkle} d="M30 6.2Q30.45 9.05 33.3 9.5Q30.45 9.95 30 12.8Q29.55 9.95 26.7 9.5Q29.55 9.05 30 6.2Z" />
          </g>
          {/* The thought bubble of the waiting states: "!" for an approval, "?" for a question, "z" for a device. */}
          <g className={styles.bubble}>
            <circle className={styles.bubbleBody} cx="33.6" cy="6.6" r="6.2" />
            <circle className={styles.bubbleBody} cx="27.9" cy="12.6" r="1.5" />
            <g className={styles.alert}>
              <path className={styles.glyph} d="M33.6 3.4V7.4" />
              <circle className={styles.glyphDot} cx="33.6" cy="9.7" r="0.95" />
            </g>
            <g className={styles.ask}>
              <path className={styles.glyph} d="M31.8 4.9Q31.9 3.2 33.6 3.2Q35.4 3.2 35.4 4.8Q35.4 5.9 34.3 6.4Q33.6 6.8 33.6 7.7" />
              <circle className={styles.glyphDot} cx="33.6" cy="9.8" r="0.9" />
            </g>
            <path className={`${styles.glyph} ${styles.sleep}`} d="M31.6 4.3H35.6L31.6 8.9H35.6" />
          </g>
        </g>
      </svg>
    </span>
  );
}
