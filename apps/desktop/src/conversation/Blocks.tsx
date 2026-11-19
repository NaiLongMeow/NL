/**
 * The conversation's simpler blocks (UI design note, section 4.2): message
 * bubbles, working text, thinking, and the thin markers and dividers.
 *
 * Bubbles hold messages and nothing else (M5). Message text is model output
 * and untrusted (T6): it renders as text, never as HTML.
 *
 * Bubbles and working text take the focus, so that the menu key and
 * Shift+F10 open their menus (section 4.15) from the keyboard.
 */

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { BookmarkCheck, ChevronLeft, ChevronRight, CircleExclamationPoint, Coffee, Inbox, RotateCcw, Undo2 } from "lucide-react";
import { useI18n } from "../i18n/I18n";
import { Avatar } from "../ui/Avatar";
import { Button, IconButton } from "../ui/Button";
import type { Quote } from "./model";
import styles from "./Blocks.module.css";

/** The user's message; a quote it carries shows above its text (section 4.15). */
export function UserBubble({ text, pending, quote, character }: { text: string; pending?: boolean; quote?: Quote; character: string }) {
  const { t } = useI18n();
  return (
    <div className={styles.userRow}>
      <div className={styles.userBubble} data-pending={pending || undefined} tabIndex={0}>
        {quote && (
          <span className={styles.quoted}>
            <strong>{quote.from === "user" ? t.blocks.you : character}</strong> {quote.text}
          </span>
        )}
        {text}
      </div>
      {pending && <span className={styles.pending}>{t.composer.pending}</span>}
    </div>
  );
}

/** The tallest the editor grows, in pixels, before it scrolls. */
const EDITOR_MAX_HEIGHT = 240;

/**
 * The user's message being edited in place (section 4.15). Send rewinds to
 * before the message and sends the new text from there; the earlier version
 * stays. Enter sends unless an input method is composing; Esc cancels.
 */
export function UserEditor({ text, onCancel, onSend }: { text: string; onCancel: () => void; onSend: (text: string) => void }) {
  const { t } = useI18n();
  const [value, setValue] = useState(text);
  const box = useRef<HTMLTextAreaElement>(null);
  const empty = value.trim() === "";

  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, EDITOR_MAX_HEIGHT)}px`;
    // As in the composer: a scrollbar only past the tallest size.
    element.style.overflowY = element.scrollHeight > EDITOR_MAX_HEIGHT ? "auto" : "hidden";
  }, [value]);
  useEffect(() => {
    const element = box.current;
    element?.focus();
    element?.setSelectionRange(element.value.length, element.value.length);
  }, []);

  const send = () => {
    if (!empty) onSend(value.trim());
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  };

  return (
    <div className={styles.userRow}>
      <div className={styles.editor}>
        <textarea
          ref={box}
          className={styles.editInput}
          rows={1}
          value={value}
          aria-label={t.menu.edit}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className={styles.editBar}>
          <span className={styles.editHint}>{t.composer.editHint}</span>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            {t.composer.cancelEdit}
          </Button>
          <Button size="sm" variant="primary" disabled={empty} onClick={send}>
            {t.composer.send}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * The character's message. The first of several in a row carries the
 * avatar; the rest line up under it, as in a chat app.
 */
export function MessageBubble({ text, name, first }: { text: string; name: string; first: boolean }) {
  return (
    <div className={styles.messageRow} data-first={first || undefined}>
      <span className={styles.avatarSlot}>{first && <Avatar size={32} label={name} />}</span>
      <div className={styles.messageBubble} tabIndex={0}>
        {text}
      </div>
    </div>
  );
}

export function WorkingText({ text }: { text: string }) {
  return (
    <p className={styles.working} tabIndex={0}>
      {text}
    </p>
  );
}

export function Thinking({ seconds }: { seconds: number }) {
  const { t } = useI18n();
  return (
    <div className={styles.thinking}>
      <ChevronRight aria-hidden />
      {t.blocks.thoughtFor(seconds)}
    </div>
  );
}

export function Remembered({ text }: { text: string }) {
  const { t } = useI18n();
  return (
    <div className={styles.marker}>
      <BookmarkCheck aria-hidden />
      <span className={styles.markerText}>
        <strong>{t.blocks.remembered}:</strong> {text}
      </span>
      <button type="button" className={styles.link}>
        {t.blocks.view}
      </button>
      <button type="button" className={styles.link}>
        {t.blocks.undo}
      </button>
    </div>
  );
}

export function Notice({ text }: { text: string }) {
  return (
    <div className={styles.marker}>
      <Inbox aria-hidden />
      <span className={styles.markerText}>{text}</span>
    </div>
  );
}

export function Summarized() {
  const { t } = useI18n();
  return (
    <div className={styles.divider} role="separator">
      <span>{t.blocks.summarized}</span>
      <button type="button" className={styles.link}>
        {t.blocks.viewSummary}
      </button>
    </div>
  );
}

/**
 * The end of a session (UI design note, section 4.11): ended by the user, or
 * archived after being idle. Carry on starts a new session from its summary.
 */
export function Archived({
  reason,
  idleMinutes,
  onCarryOn,
}: {
  reason: "ended" | "idle";
  idleMinutes?: number;
  onCarryOn: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className={styles.divider} role="separator">
      <span>{reason === "idle" ? t.blocks.archivedIdle(idleMinutes ?? 0) : t.blocks.archivedEnded}</span>
      <button type="button" className={styles.link} onClick={onCarryOn}>
        {t.blocks.carryOn}
      </button>
    </div>
  );
}

/**
 * Where the conversation went more than one way from a checkpoint (section
 * 4.16): which way this is, and buttons that show the others. It lines up
 * with the block it stands before.
 */
export function Versions({
  index,
  count,
  align,
  onShow,
}: {
  index: number;
  count: number;
  align: "start" | "end";
  onShow: (index: number) => void;
}) {
  const { t } = useI18n();
  return (
    <div className={styles.versions} data-align={align} role="group" aria-label={t.blocks.versions(index + 1, count)}>
      <IconButton label={t.blocks.previousVersion} size="sm" disabled={index === 0} onClick={() => onShow(index - 1)}>
        <ChevronLeft />
      </IconButton>
      <span aria-hidden>
        {index + 1} / {count}
      </span>
      <IconButton label={t.blocks.nextVersion} size="sm" disabled={index === count - 1} onClick={() => onShow(index + 1)}>
        <ChevronRight />
      </IconButton>
    </div>
  );
}

/** The end of a rewound conversation (section 4.16): what came after is kept, and Restore brings it back. */
export function Rewound({ onRestore }: { onRestore: () => void }) {
  const { t } = useI18n();
  return (
    <div className={styles.marker} role="status">
      <Undo2 aria-hidden />
      <span className={styles.markerText}>{t.blocks.rewound}</span>
      <button type="button" className={styles.link} onClick={onRestore}>
        {t.blocks.restore}
      </button>
    </div>
  );
}

export function ErrorRow({ reason }: { reason: string }) {
  const { t } = useI18n();
  return (
    <div className={styles.error} role="alert">
      <CircleExclamationPoint aria-hidden />
      <span className={styles.markerText}>{reason}</span>
      <Button size="sm" variant="ghost" icon={<RotateCcw />}>
        {t.blocks.retry}
      </Button>
    </div>
  );
}

/** The break reminder after two hours of conversation (product rule 4, legal context). */
export function BreakCard() {
  const { t } = useI18n();
  return (
    <aside className={styles.system}>
      <Coffee aria-hidden className={styles.systemIcon} />
      <div>
        <h3>{t.system.breakTitle}</h3>
        <p>{t.system.breakBody}</p>
      </div>
      <Button size="sm">{t.system.dismiss}</Button>
    </aside>
  );
}
