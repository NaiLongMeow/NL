/**
 * A message beside the pet (UI design note, sections 4.14 and 6): the
 * character's message, sent while the main window was not in front.
 *
 * It fades after a time that grows with its length; the pointer on it keeps
 * it, and once the pointer leaves it fades soon after. A long message is cut
 * short and offers "Open in window"; a click anywhere on it opens the main
 * window. Its text is plain text: model output never becomes markup (T6).
 */

import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/I18n";
import styles from "./PetBubble.module.css";

/** Longer messages are cut short and offer "Open in window". */
export const LONG_MESSAGE = 140;

/** How long a bubble stays after the pointer leaves it, in milliseconds. */
export const AFTER_HOVER_MS = 2500;

/** How long a message stays, in milliseconds: long enough to read it, never long enough to linger. */
export function bubbleTime(text: string): number {
  return Math.min(15_000, Math.max(4_000, 2_500 + 60 * [...text].length));
}

export function PetBubble({ text, onOpen, onDone }: { text: string; onOpen: () => void; onDone: () => void }) {
  const { t } = useI18n();
  const [hovered, setHovered] = useState(false);
  const wasHovered = useRef(false);
  // The latest callback, so that the window re-rendering never restarts the timer.
  const done = useRef(onDone);
  done.current = onDone;
  const long = [...text].length > LONG_MESSAGE;

  useEffect(() => {
    if (hovered) return;
    const timer = window.setTimeout(() => done.current(), wasHovered.current ? AFTER_HOVER_MS : bubbleTime(text));
    return () => window.clearTimeout(timer);
  }, [hovered, text]);

  return (
    <div
      className={styles.bubble}
      role="status"
      onMouseEnter={() => {
        wasHovered.current = true;
        setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
      // The bubble is not part of the pet: pressing it neither drags the window nor squishes the avatar.
      onMouseDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onClick={onOpen}
    >
      <p className={styles.text} data-long={long || undefined}>
        {text}
      </p>
      {long && <span className={styles.open}>{t.pet.openInWindow}</span>}
    </div>
  );
}
