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
 * Pointing at it squishes it, eyes shut tight, and it springs back. Asked to
 * play (`play="joy"`, when the pet is double-clicked), it jumps for joy with
 * ^ ^ eyes, rosy cheeks, and sparkles. With reduced motion it keeps still:
 * the eyes, cheeks, and bubbles still show the state, and a still ring in the
 * theme's accent shows that it works.
 *
 * Every part that moves is its own HTML layer covering the whole avatar,
 * with its shapes drawn in an SVG inside it, because the webviews run CSS
 * animations of SVG elements on the page's main thread and animations of an
 * HTML element's transform and opacity on the compositor: in WebView2 the
 * SVG version cost about ten times as much (2026-11-19). Nothing inside a
 * layer's SVG is animated, so each layer is drawn once and then only moved.
 */

import { useId, type CSSProperties, type ReactNode } from "react";
import styles from "./Avatar.module.css";

export type AvatarCue = "idle" | "working" | "approval" | "question" | "device" | "listening";

/** Something the ball plays once, on top of its state: "joy", a jump for joy. */
export type AvatarPlay = "joy";

/**
 * How far apart, in seconds, avatars on one page start their loops (a
 * multiple of it for the longer ones), so that a column of them never moves
 * in step.
 */
const PHASE_SPREAD = 5;

/** One moving part of the ball: a box over the whole avatar that moves as a unit. */
function Layer({ className, children }: { className: string | undefined; children: ReactNode }) {
  return <span className={`${styles.layer} ${className ?? ""}`}>{children}</span>;
}

/** Shapes in the ball's 40-unit space, filling the layer they sit in. */
function Art({ children }: { children: ReactNode }) {
  return (
    <svg className={styles.art} viewBox="0 0 40 40">
      {children}
    </svg>
  );
}

export function Avatar({ size, cue = "idle", play, label }: { size: number; cue?: AvatarCue; play?: AvatarPlay; label?: string }) {
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
      data-play={play}
      style={style}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {/* One kind of motion per layer, so that they add up: the state's movement, then breathing. */}
      <Layer className={styles.motion}>
        <Layer className={styles.breath}>
          <Art>
            <defs>
              <clipPath id={clip}>
                <circle cx="20" cy="21" r="17" />
              </clipPath>
            </defs>
            <circle className={styles.rim} cx="20" cy="21" r="17" />
            {/* Flat shading: the lit body, set up and to the left inside the ball, leaves a darker rim. */}
            <circle className={styles.body} cx="18.6" cy="19.4" r="17" clipPath={`url(#${clip})`} />
            <ellipse className={styles.shine} cx="11.6" cy="11.2" rx="3.3" ry="1.8" transform="rotate(-40 11.6 11.2)" />
            <circle className={styles.shine} cx="15.7" cy="8.3" r="1.05" />
          </Art>
          <Layer className={`${styles.cheek} ${styles.cheekLeft}`}>
            <Art>
              <ellipse className={styles.blush} cx="10.4" cy="24.6" rx="2.9" ry="1.7" />
            </Art>
          </Layer>
          <Layer className={`${styles.cheek} ${styles.cheekRight}`}>
            <Art>
              <ellipse className={styles.blush} cx="29.6" cy="24.6" rx="2.9" ry="1.7" />
            </Art>
          </Layer>
          <Layer className={styles.gaze}>
            <Layer className={styles.eyes}>
              <Layer className={`${styles.open} ${styles.openLeft}`}>
                <Art>
                  <rect className={styles.eye} x="12" y="13" width="5" height="9.5" rx="2.5" />
                </Art>
              </Layer>
              <Layer className={`${styles.open} ${styles.openRight}`}>
                <Art>
                  <rect className={styles.eye} x="23" y="13" width="5" height="9.5" rx="2.5" />
                </Art>
              </Layer>
              <Layer className={`${styles.happy} ${styles.happyLeft}`}>
                <Art>
                  <path className={styles.line} d="M11.6 19.6Q14.5 14.4 17.4 19.6" />
                </Art>
              </Layer>
              <Layer className={`${styles.happy} ${styles.happyRight}`}>
                <Art>
                  <path className={styles.line} d="M22.6 19.6Q25.5 14.4 28.4 19.6" />
                </Art>
              </Layer>
              <Layer className={styles.squint}>
                <Art>
                  <path className={styles.line} d="M12.4 14.6L16.6 17.75L12.4 20.9" />
                  <path className={styles.line} d="M27.6 14.6L23.4 17.75L27.6 20.9" />
                </Art>
              </Layer>
            </Layer>
          </Layer>
          <Layer className={styles.sparkle}>
            <Art>
              <path className={styles.star} d="M30 6.2Q30.45 9.05 33.3 9.5Q30.45 9.95 30 12.8Q29.55 9.95 26.7 9.5Q29.55 9.05 30 6.2Z" />
            </Art>
          </Layer>
        </Layer>
        {/* The thought bubble of the waiting states: "!" for an approval, "?" for a question, "z" for a device. */}
        <Layer className={styles.bubble}>
          <Art>
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
          </Art>
        </Layer>
      </Layer>
    </span>
  );
}
