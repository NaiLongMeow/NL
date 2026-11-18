/**
 * Cards inside the conversation: approval requests (UI design note,
 * section 4.5; T7) and tasks running on other devices (section 4.6; S8).
 */

import { useId, useState } from "react";
import { Check, ChevronRight, ListTodo, LoaderCircle, ShieldQuestionMark, Square, X } from "lucide-react";
import { useI18n } from "../i18n/I18n";
import { Button } from "../ui/Button";
import { formatDuration } from "./format";
import type { ApprovalRequest, Task, ToolCall } from "./model";
import { ToolRow } from "./ToolRow";
import styles from "./Cards.module.css";

/**
 * Asks in place, never as a modal (principle 5). No button takes the
 * default focus, so a stray Enter approves nothing.
 */
export function ApprovalCard({
  request,
  character,
  onAnswer,
}: {
  request: ApprovalRequest;
  character: string;
  onAnswer: (decision: "allowed" | "denied") => void;
}) {
  const { t } = useI18n();
  const [showArguments, setShowArguments] = useState(false);
  const argumentsId = useId();
  const titleId = useId();
  return (
    <section className={styles.card} data-kind="approval" aria-labelledby={titleId}>
      <header className={styles.header}>
        <ShieldQuestionMark className={styles.approvalIcon} aria-hidden />
        <h3 id={titleId} className={styles.title}>
          {t.approval.title(character, request.action, request.device)}
        </h3>
      </header>
      <p className={styles.why}>{t.approval.why[request.reason]}</p>
      <button
        type="button"
        className={styles.disclosure}
        aria-expanded={showArguments}
        aria-controls={argumentsId}
        onClick={() => setShowArguments(!showArguments)}
      >
        <ChevronRight aria-hidden />
        {showArguments ? t.approval.hideArguments : t.approval.showArguments}
      </button>
      {showArguments && (
        <pre className={styles.code} id={argumentsId}>
          {request.arguments}
        </pre>
      )}
      {request.decision ? (
        <p className={styles.decision} data-decision={request.decision}>
          {request.decision === "allowed" ? <Check aria-hidden /> : <X aria-hidden />}
          {request.decision === "allowed" ? t.approval.allowed : t.approval.denied}
        </p>
      ) : (
        <div className={styles.actions}>
          <Button variant="primary" onClick={() => onAnswer("allowed")}>
            {t.approval.allowOnce}
          </Button>
          <Button onClick={() => onAnswer("allowed")}>{t.approval.alwaysAllow}</Button>
          <Button onClick={() => onAnswer("denied")}>{t.approval.deny}</Button>
          <Button variant="ghost" onClick={() => onAnswer("denied")}>
            {t.approval.denyWithReason}
          </Button>
        </div>
      )}
    </section>
  );
}

export function TaskCard({ task, onOpen }: { task: Task; onOpen: (call: ToolCall) => void }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const stepsId = useId();
  const titleId = useId();
  return (
    <section className={styles.card} data-kind="task" aria-labelledby={titleId}>
      <header className={styles.header}>
        <ListTodo className={styles.taskIcon} aria-hidden />
        <h3 id={titleId} className={styles.title}>
          {task.title}
        </h3>
        <span className={styles.meta}>
          {t.task.on(task.device)} · {t.task.elapsed(formatDuration(task.elapsedSeconds * 1000, t))}
        </span>
        {task.running && (
          <Button size="sm" variant="ghost" icon={<Square />}>
            {t.task.stop}
          </Button>
        )}
      </header>
      <p className={styles.live}>
        {task.running && <LoaderCircle className={styles.spin} aria-hidden />}
        {task.latest}
      </p>
      <button
        type="button"
        className={styles.disclosure}
        aria-expanded={expanded}
        aria-controls={stepsId}
        onClick={() => setExpanded(!expanded)}
      >
        <ChevronRight aria-hidden />
        {t.task.steps} ({task.steps.length})
      </button>
      {expanded && (
        <div id={stepsId} className={styles.steps}>
          {task.steps.map((step) => (
            <ToolRow key={step.id} call={step} onOpen={onOpen} />
          ))}
        </div>
      )}
    </section>
  );
}
