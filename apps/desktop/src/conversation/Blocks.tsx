/**
 * The conversation's simpler blocks (UI design note, section 4.2): message
 * bubbles, working text, thinking, and the thin markers and dividers.
 *
 * Bubbles hold messages and nothing else (M5). Message text is model output
 * and untrusted (T6): it renders as text, never as HTML.
 */

import { BookmarkCheck, ChevronRight, CircleExclamationPoint, Coffee, Inbox, RotateCcw } from "lucide-react";
import { useI18n } from "../i18n/I18n";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import styles from "./Blocks.module.css";

export function UserBubble({ text, pending }: { text: string; pending?: boolean }) {
  const { t } = useI18n();
  return (
    <div className={styles.userRow}>
      <div className={styles.userBubble} data-pending={pending || undefined}>
        {text}
      </div>
      {pending && <span className={styles.pending}>{t.composer.pending}</span>}
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
      <div className={styles.messageBubble}>{text}</div>
    </div>
  );
}

export function WorkingText({ text }: { text: string }) {
  return <p className={styles.working}>{text}</p>;
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

export function Ended() {
  const { t } = useI18n();
  return (
    <div className={styles.divider} role="separator">
      <span>{t.blocks.ended}</span>
      <button type="button" className={styles.link}>
        {t.blocks.carryOn}
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
