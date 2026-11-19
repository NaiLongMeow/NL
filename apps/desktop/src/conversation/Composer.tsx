/**
 * Where the user writes (UI design note, section 4.8).
 *
 * Enter sends and Shift+Enter starts a new line; Enter never sends while an
 * input method is composing, so Chinese and Japanese input works. While the
 * character replies, the send button becomes Stop when the box is empty,
 * and Esc stops too (P7); a message sent then cuts in at the turn's next
 * step. While the character waits for the answer to a question, what the
 * user sends is the answer (section 4.13), and the box says so. A small ring
 * shows how full the context is. A quoted block (section 4.15) shows above
 * the text until the message is sent or the user removes it.
 */

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp, Mic, Paperclip, Square, TextQuote, X } from "lucide-react";
import { Tooltip } from "radix-ui";
import { useI18n } from "../i18n/I18n";
import { IconButton } from "../ui/Button";
import type { Quote } from "./model";
import styles from "./Composer.module.css";

interface Props {
  character: string;
  running: boolean;
  /** A question waits for its answer. */
  answering?: boolean;
  contextUsed: number;
  /** The block the next message quotes. */
  quote?: Quote;
  onClearQuote?: () => void;
  onSend: (text: string) => void;
  onStop: () => void;
}

/** Above this share of the context the ring warns that a summary is coming. */
const NEAR_LIMIT = 0.85;
/** The tallest the box grows, in pixels, before it scrolls. */
const MAX_HEIGHT = 240;

export function Composer({ character, running, answering = false, contextUsed, quote, onClearQuote, onSend, onStop }: Props) {
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
    // Scrolling only past the tallest size: a fraction of a pixel left over at
    // some display scales would otherwise show a scrollbar on a short text.
    element.style.overflowY = element.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
  }, [text]);

  // Quoting a block is a step towards writing about it.
  useEffect(() => {
    if (quote) box.current?.focus();
  }, [quote]);

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
        {quote && (
          <div className={styles.quote}>
            <TextQuote aria-hidden />
            <span className={styles.quoteText}>
              <strong>{t.composer.quoting(quote.from === "user" ? t.blocks.you : character)}</strong> {quote.text}
            </span>
            <IconButton label={t.composer.removeQuote} size="sm" onClick={onClearQuote}>
              <X />
            </IconButton>
          </div>
        )}
        <textarea
          ref={box}
          className={styles.input}
          rows={1}
          value={text}
          placeholder={answering ? t.composer.answerPlaceholder(character) : t.composer.placeholder(character)}
          aria-label={answering ? t.composer.answerPlaceholder(character) : t.composer.placeholder(character)}
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
