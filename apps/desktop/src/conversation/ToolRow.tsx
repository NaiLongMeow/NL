/**
 * Tool calls in the full view (UI design note, section 4.4): one row each,
 * reading status, tool icon, display name with its key argument, a short
 * result, and the duration. Expanding shows a preview of the input and
 * output; Open puts the whole call in the detail panel. Three or more calls
 * in a row fold into one group row.
 */

import { useId, useState, type ReactNode } from "react";
import {
  Ban,
  BusFront,
  Check,
  ChevronRight,
  CircleExclamationPoint,
  FileText,
  Globe,
  Brain,
  ListTodo,
  LoaderCircle,
  MessageCircle,
  Monitor,
  Scissors,
  ShieldQuestionMark,
  WifiOff,
  Wrench,
} from "lucide-react";
import { useI18n } from "../i18n/I18n";
import { formatDuration } from "./format";
import { toolDisplayName, type ToolCall, type ToolCategory, type ToolStatus } from "./model";
import styles from "./ToolRow.module.css";

const CATEGORY_ICONS: Record<ToolCategory, ReactNode> = {
  web: <Globe />,
  files: <FileText />,
  memory: <Brain />,
  messages: <MessageCircle />,
  booking: <BusFront />,
  device: <Monitor />,
  task: <ListTodo />,
  other: <Wrench />,
};

const STATUS_ICONS: Record<ToolStatus, ReactNode> = {
  running: (
    <span className={styles.spin}>
      <LoaderCircle />
    </span>
  ),
  done: <Check />,
  failed: <CircleExclamationPoint />,
  cancelled: <Ban />,
  waiting: <ShieldQuestionMark />,
  offline: <WifiOff />,
};

export function ToolRow({ call, onOpen }: { call: ToolCall; onOpen: (call: ToolCall) => void }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const previewId = useId();
  const failed = call.status === "failed" || call.status === "offline";
  return (
    <div className={styles.call} data-status={call.status}>
      <button
        type="button"
        className={styles.row}
        aria-expanded={expanded}
        aria-controls={previewId}
        onClick={() => setExpanded(!expanded)}
      >
        <span className={styles.status} title={t.blocks.status[call.status]}>
          {STATUS_ICONS[call.status]}
        </span>
        <span className={styles.category}>{CATEGORY_ICONS[call.category]}</span>
        <span className={styles.name}>{toolDisplayName(call.name)}</span>
        {failed && call.failure ? (
          <span className={styles.failure}>{call.failure}</span>
        ) : call.summary ? (
          <span className={styles.summary}>· {call.summary}</span>
        ) : null}
        {call.cut && (
          <span className={styles.cut} title={t.blocks.cut} aria-label={t.blocks.cut}>
            <Scissors />
          </span>
        )}
        <span className={styles.spacer} />
        {call.durationMs !== undefined && <span className={styles.duration}>{formatDuration(call.durationMs, t)}</span>}
        <ChevronRight className={styles.chevron} aria-hidden />
      </button>
      {expanded && (
        <div className={styles.preview} id={previewId}>
          {call.input && (
            <section>
              <h4>{t.blocks.input}</h4>
              <pre>{call.input}</pre>
            </section>
          )}
          {call.output && (
            <section>
              <h4>{t.blocks.output}</h4>
              <pre>{call.output}</pre>
            </section>
          )}
          {call.cut && <p className={styles.note}>{t.blocks.cut}</p>}
          <button type="button" className={styles.open} onClick={() => onOpen(call)}>
            {t.blocks.open}
          </button>
        </div>
      )}
    </div>
  );
}

export function ToolGroup({ calls, onOpen }: { calls: ToolCall[]; onOpen: (call: ToolCall) => void }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const running = calls.find((call) => call.status === "running");
  const anyFailed = calls.some((call) => call.status === "failed" || call.status === "offline");
  const names = calls.map((call) => toolDisplayName({ ...call.name, argument: undefined }));
  return (
    <div className={styles.group}>
      <button
        type="button"
        className={styles.row}
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={() => setExpanded(!expanded)}
      >
        <span className={styles.status}>{running ? STATUS_ICONS.running : anyFailed ? STATUS_ICONS.failed : STATUS_ICONS.done}</span>
        <span className={styles.groupLabel}>{t.blocks.usedTools(calls.length)}</span>
        <span className={styles.summary}>
          · {running ? toolDisplayName(running.name) : [...new Set(names)].join(", ")}
        </span>
        <span className={styles.spacer} />
        <ChevronRight className={styles.chevron} aria-hidden />
      </button>
      {expanded && (
        <div className={styles.nested} id={listId}>
          {calls.map((call) => (
            <ToolRow key={call.id} call={call} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}
