/**
 * Cards inside the conversation: approval requests (UI design note,
 * section 4.5; T7), the tasks a session dispatched, and a task it received
 * (section 4.12; S8).
 */

import { useId, useState } from "react";
import {
  Check,
  ChevronRight,
  CircleX,
  Clock,
  CornerDownRight,
  Inbox,
  LoaderCircle,
  ShieldQuestionMark,
  Split,
  WifiOff,
  X,
} from "lucide-react";
import { useI18n } from "../i18n/I18n";
import { Button } from "../ui/Button";
import { countByStatus, type ApprovalRequest, type DispatchStatus, type DispatchedTask, type SessionLink } from "./model";
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

/** The icon of each dispatch status: quiet for running and done, warning for what waits on the user. */
function StatusIcon({ status }: { status: DispatchStatus }) {
  switch (status) {
    case "queued":
      return <Clock aria-hidden />;
    case "running":
      return <LoaderCircle className={styles.spin} aria-hidden />;
    case "approval":
      return <ShieldQuestionMark aria-hidden />;
    case "device":
      return <WifiOff aria-hidden />;
    case "done":
      return <Check aria-hidden />;
    case "failed":
      return <CircleX aria-hidden />;
  }
}

const STATUS_ORDER: readonly DispatchStatus[] = ["running", "approval", "device", "queued", "done", "failed"];

/**
 * The tasks a session handed out (UI design note, section 4.12): each row
 * names the task, the session it went to (marked New when the harness
 * started it, or kept in this session), and its live status, and opens that
 * session. The footer says the tasks outlive this session.
 */
export function DispatchCard({ tasks, onOpenSession }: { tasks: DispatchedTask[]; onOpenSession: (id: string) => void }) {
  const { t } = useI18n();
  const titleId = useId();
  const counts = countByStatus(tasks);
  return (
    <section className={styles.card} data-kind="dispatch" aria-labelledby={titleId}>
      <header className={styles.header}>
        <Split className={styles.dispatchIcon} aria-hidden />
        <h3 id={titleId} className={styles.title}>
          {t.dispatch.title(tasks.length)}
        </h3>
        <span className={styles.meta}>
          {STATUS_ORDER.filter((status) => counts[status]).map((status) => t.dispatch.count[status](counts[status]!)).join(" · ")}
        </span>
      </header>
      <ul className={styles.tasks}>
        {tasks.map((task) => (
          <li key={task.id} className={styles.task} data-status={task.status}>
            <span className={styles.taskStatus} title={t.dispatch.status[task.status]}>
              <StatusIcon status={task.status} />
              <span className={styles.visuallyHidden}>{t.dispatch.status[task.status]}</span>
            </span>
            <span className={styles.taskTitle}>{task.title}</span>
            {task.session ? (
              <button
                type="button"
                className={styles.taskTarget}
                aria-label={t.dispatch.open(task.session.title)}
                onClick={() => onOpenSession(task.session!.id)}
              >
                <CornerDownRight aria-hidden />
                <span className={styles.targetTitle}>{task.session.title}</span>
                {task.session.created && <span className={styles.badge}>{t.dispatch.created}</span>}
                <span className={styles.targetWhere}>
                  {task.session.kind === "shared" ? t.dispatch.shared : task.session.device}
                </span>
              </button>
            ) : (
              <span className={styles.taskKept}>{t.dispatch.kept}</span>
            )}
            {task.note && <span className={styles.taskNote}>{task.note}</span>}
          </li>
        ))}
      </ul>
      <p className={styles.footer}>{t.dispatch.footer}</p>
    </section>
  );
}

/**
 * A task this session received from another (UI design note, section 4.12),
 * in the dispatcher's words, with a link to the session it came from.
 */
export function ReceivedCard({ text, from, onOpenSession }: { text: string; from: SessionLink; onOpenSession: (id: string) => void }) {
  const { t } = useI18n();
  const titleId = useId();
  return (
    <section className={styles.received} aria-labelledby={titleId}>
      <header className={styles.header}>
        <Inbox className={styles.receivedIcon} aria-hidden />
        <h3 id={titleId} className={styles.title}>
          {t.received.title}
        </h3>
        <button type="button" className={styles.fromLink} onClick={() => onOpenSession(from.id)}>
          {from.archived ? `${t.received.from(from.title)} · ${t.received.archived}` : t.received.from(from.title)}
        </button>
      </header>
      <p className={styles.receivedText}>{text}</p>
    </section>
  );
}
