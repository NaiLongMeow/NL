/**
 * Where the user writes (UI design note, section 4.8).
 *
 * Enter sends and Shift+Enter starts a new line; Enter never sends while an
 * input method is composing, so Chinese and Japanese input works. While the
 * character replies, the send button becomes Stop when the box is empty,
 * and Esc stops too (P7); a message sent then cuts in at the turn's next
 * step. A small ring shows how full the context is.
 */

import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp, Mic, Paperclip, Square } from "lucide-react";
import { Tooltip } from "radix-ui";
import { useI18n } from "../i18n/I18n";
import { IconButton } from "../ui/Button";
import styles from "./Composer.module.css";

interface Props {
  character: string;
  running: boolean;
  contextUsed: number;
  onSend: (text: string) => void;
  onStop: () => void;
}

/** Above this share of the context the ring warns that a summary is coming. */
const NEAR_LIMIT = 0.85;
/** The tallest the box grows, in pixels, before it scrolls. */
const MAX_HEIGHT = 240;

export function Composer({ character, running, contextUsed, onSend, onStop }: Props) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const box = useRef<HTMLTextAreaElement>(null);
  const empty = text.trim() === "";

  // Grow with the text up to a limit, then scroll inside the box.
  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT)}px`;
  }, [text]);

  const send = () => {
    if (empty) return;
    onSend(text.trim());
    setText("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape" && running) {
      event.preventDefault();
      onStop();
      return;
    }
    // `isComposing` is true while an input method shows its candidates;
    // Enter then picks a candidate and must not send.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  };

  const percent = Math.round(contextUsed * 100);
  const near = contextUsed >= NEAR_LIMIT;

  return (
    <div className={styles.dock}>
      <div className={styles.composer} onClick={() => box.current?.focus()}>
        <textarea
          ref={box}
          className={styles.input}
          rows={1}
          value={text}
          placeholder={t.composer.placeholder(character)}
          aria-label={t.composer.placeholder(character)}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className={styles.bar}>
          <IconButton label={t.composer.attach} size="sm">
            <Paperclip />
          </IconButton>
          <IconButton label={t.composer.microphone} size="sm">
            <Mic />
          </IconButton>
          <span className={styles.hint}>{t.composer.hint}</span>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <span className={styles.ring} data-near={near || undefined} tabIndex={0} aria-label={t.composer.context(percent)}>
                <svg viewBox="0 0 20 20" aria-hidden>
                  <circle cx="10" cy="10" r="8" className={styles.track} />
                  <circle
                    cx="10"
                    cy="10"
                    r="8"
                    className={styles.fill}
                    strokeDasharray={`${(2 * Math.PI * 8 * contextUsed).toFixed(2)} ${(2 * Math.PI * 8).toFixed(2)}`}
                  />
                </svg>
              </span>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className={styles.tooltip} sideOffset={6}>
                {t.composer.context(percent)}
                {near && <div>{t.composer.contextNearLimit}</div>}
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
          {running && empty ? (
            <IconButton label={t.composer.stop} variant="primary" shape="round" size="sm" onClick={onStop}>
              <Square className={styles.stopIcon} />
            </IconButton>
          ) : (
            <IconButton label={t.composer.send} variant="primary" shape="round" size="sm" disabled={empty} onClick={send}>
              <ArrowUp />
            </IconButton>
          )}
        </div>
      </div>
    </div>
  );
}
