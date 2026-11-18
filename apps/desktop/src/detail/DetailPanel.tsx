/**
 * The detail panel (UI design note, sections 4.4 and 5): everything about
 * one tool call, opened from its row. It shows the full output from the
 * conversation's output file even when the model saw only part of it (M7).
 * Raw events appear only with developer details on.
 */

import { Copy, Pin, PinOff, X } from "lucide-react";
import { useI18n } from "../i18n/I18n";
import { IconButton } from "../ui/Button";
import { formatDuration } from "../conversation/format";
import { toolDisplayName, type ToolCall } from "../conversation/model";
import styles from "./DetailPanel.module.css";

interface Props {
  call: ToolCall | undefined;
  pinned: boolean;
  developerDetails: boolean;
  onPin: (pinned: boolean) => void;
  onClose: () => void;
}

export function DetailPanel({ call, pinned, developerDetails, onPin, onClose }: Props) {
  const { t } = useI18n();
  return (
    <aside className={styles.panel} aria-label={t.detail.title}>
      <header className={styles.header}>
        <h2>{t.detail.title}</h2>
        <IconButton label={pinned ? t.detail.unpin : t.detail.pin} size="sm" onClick={() => onPin(!pinned)}>
          {pinned ? <PinOff /> : <Pin />}
        </IconButton>
        <IconButton label={t.detail.close} size="sm" onClick={onClose}>
          <X />
        </IconButton>
      </header>
      {call ? (
        <div className={styles.body}>
          <p className={styles.name}>{toolDisplayName(call.name)}</p>
          <dl className={styles.facts}>
            <dt>{t.detail.status}</dt>
            <dd>{t.blocks.status[call.status]}</dd>
            <dt>{t.detail.device}</dt>
            <dd>{call.device}</dd>
            <dt>{t.detail.started}</dt>
            <dd>{call.startedAt}</dd>
            {call.durationMs !== undefined && (
              <>
                <dt>{t.detail.duration}</dt>
                <dd>{formatDuration(call.durationMs, t)}</dd>
              </>
            )}
          </dl>
          {call.input && <Section title={t.blocks.input} text={call.input} copy={t.detail.copy} />}
          {call.output && (
            <Section
              title={t.blocks.output}
              text={call.output}
              copy={t.detail.copy}
              note={call.cut ? t.detail.fullOutput : undefined}
            />
          )}
          {developerDetails && (
            <Section
              title="events"
              text={JSON.stringify({ type: "tool_call", id: call.id, name: call.name, status: call.status }, null, 2)}
              copy={t.detail.copy}
            />
          )}
        </div>
      ) : (
        <p className={styles.empty}>{t.detail.nothing}</p>
      )}
    </aside>
  );
}

function Section({ title, text, copy, note }: { title: string; text: string; copy: string; note?: string }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3>{title}</h3>
        <IconButton label={copy} size="sm" onClick={() => void navigator.clipboard?.writeText(text)}>
          <Copy />
        </IconButton>
      </div>
      {note && <p className={styles.note}>{note}</p>}
      <pre>{text}</pre>
    </section>
  );
}
