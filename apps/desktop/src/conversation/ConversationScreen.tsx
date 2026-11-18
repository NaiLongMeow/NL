/**
 * The session screen (UI design note, section 4): the transcript and the
 * composer, reading one session from a `SessionSource`. Its header sits in
 * the window's title bar (Header.tsx, section 5). An archived session is
 * read-only: Carry on replaces the composer.
 */

import { useSyncExternalStore } from "react";
import { useI18n } from "../i18n/I18n";
import { Button } from "../ui/Button";
import { Composer } from "./Composer";
import { pendingQuestion, type ToolCall, type View } from "./model";
import type { SessionSource } from "./source";
import { Transcript } from "./Transcript";
import styles from "./ConversationScreen.module.css";

interface Props {
  source: SessionSource;
  id: string;
  view: View;
  onOpen: (call: ToolCall) => void;
  /** Opens another session, such as the one a task went to or came from. */
  onOpenSession: (id: string) => void;
}

export function ConversationScreen({ source, id, view, onOpen, onOpenSession }: Props) {
  const { t } = useI18n();
  const conversation = useSyncExternalStore(source.subscribe, () => source.conversation(id));
  if (!conversation) return <main className={styles.screen} />;
  const carryOn = () => onOpenSession(source.carryOn(id));
  return (
    <main className={styles.screen} aria-label={conversation.title}>
      <Transcript
        conversation={conversation}
        view={view}
        onOpen={onOpen}
        onAnswer={(approvalId, decision) => source.answer(id, approvalId, decision)}
        onAnswerQuestion={(questionId, answer) => source.answerQuestion(id, questionId, answer)}
        onOpenSession={onOpenSession}
        onCarryOn={carryOn}
      />
      {conversation.archived ? (
        <div className={styles.archived}>
          <span>{t.composer.archived}</span>
          <Button variant="primary" onClick={carryOn}>
            {t.blocks.carryOn}
          </Button>
        </div>
      ) : (
        <Composer
          character={conversation.character.name}
          running={conversation.activity !== undefined}
          answering={pendingQuestion(conversation) !== undefined}
          contextUsed={conversation.contextUsed}
          onSend={(text) => source.send(id, text)}
          onStop={() => source.stop(id)}
        />
      )}
    </main>
  );
}
