/**
 * The session screen (UI design note, section 4): the transcript and the
 * composer, reading one session from a `SessionSource`. Its header sits in
 * the window's title bar (Header.tsx, section 5). An archived session is
 * read-only: Carry on replaces the composer.
 *
 * The blocks' menus act on the session (sections 4.15 and 4.16): Quote puts
 * a block above the composer until the next message carries it or the user
 * removes it; Edit, Rewind, the versions rows, and Restore move the session
 * to another checkpoint.
 */

import { useState, useSyncExternalStore } from "react";
import { useI18n } from "../i18n/I18n";
import { Button } from "../ui/Button";
import { Composer } from "./Composer";
import { pendingQuestion, type Quote, type ToolCall, type View } from "./model";
import type { SessionSource } from "./source";
import { Transcript, type BlockActions } from "./Transcript";
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
  const [quote, setQuote] = useState<Quote>();
  if (!conversation) return <main className={styles.screen} />;
  const carryOn = () => onOpenSession(source.carryOn(id));
  const actions: BlockActions | undefined = conversation.archived
    ? undefined
    : {
        quote: setQuote,
        edit: (blockId, text) => source.edit(id, blockId, text),
        rewind: (blockId) => source.rewind(id, blockId),
        showVersion: (fork, index) => source.showVersion(id, fork, index),
        restore: () => source.restore(id),
      };
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
        actions={actions}
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
          quote={quote}
          onClearQuote={() => setQuote(undefined)}
          onSend={(text) => {
            if (quote) source.send(id, text, quote);
            else source.send(id, text);
            setQuote(undefined);
          }}
          onStop={() => source.stop(id)}
        />
      )}
    </main>
  );
}
