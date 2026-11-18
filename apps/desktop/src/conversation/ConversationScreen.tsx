/**
 * The conversation screen (UI design note, section 4): header, transcript,
 * and composer, reading one conversation from a `ConversationSource`.
 */

import { useSyncExternalStore } from "react";
import { Composer } from "./Composer";
import { Header } from "./Header";
import type { ToolCall, View } from "./model";
import type { ConversationSource } from "./source";
import { Transcript } from "./Transcript";
import styles from "./ConversationScreen.module.css";

interface Props {
  source: ConversationSource;
  id: string;
  view: View;
  onViewChange: (view: View) => void;
  developerDetails: boolean;
  onDeveloperDetailsChange: (on: boolean) => void;
  onOpen: (call: ToolCall) => void;
}

export function ConversationScreen({ source, id, view, onViewChange, developerDetails, onDeveloperDetailsChange, onOpen }: Props) {
  const conversation = useSyncExternalStore(source.subscribe, () => source.conversation(id));
  if (!conversation) return <main className={styles.screen} />;
  return (
    <main className={styles.screen}>
      <Header
        conversation={conversation}
        view={view}
        onViewChange={onViewChange}
        developerDetails={developerDetails}
        onDeveloperDetailsChange={onDeveloperDetailsChange}
      />
      <Transcript
        conversation={conversation}
        view={view}
        onOpen={onOpen}
        onAnswer={(approvalId, decision) => source.answer(id, approvalId, decision)}
      />
      <Composer
        character={conversation.character.name}
        running={conversation.activity !== undefined}
        contextUsed={conversation.contextUsed}
        onSend={(text) => source.send(id, text)}
        onStop={() => source.stop(id)}
      />
    </main>
  );
}
