/**
 * The scrolling column of a session: its blocks for the chosen view, then
 * the working indicator while a turn runs (UI design note, sections 4.1 to
 * 4.12).
 *
 * The view stays at the bottom as content arrives unless the user has
 * scrolled up. Screen readers hear each finished message through the polite
 * live region, not every streamed character.
 */

import { useEffect, useLayoutEffect, useRef } from "react";
import { useI18n } from "../i18n/I18n";
import { Avatar } from "../ui/Avatar";
import { Archived, BreakCard, ErrorRow, MessageBubble, Notice, Remembered, Summarized, Thinking, UserBubble, WorkingText } from "./Blocks";
import { ApprovalCard, DispatchCard, QuestionCard, ReceivedCard } from "./Cards";
import {
  characterState,
  shownBlocks,
  startsGroup,
  type Conversation,
  type QuestionAnswer,
  type ShownBlock,
  type ToolCall,
  type View,
} from "./model";
import { ToolGroup, ToolRow } from "./ToolRow";
import styles from "./Transcript.module.css";

interface Props {
  conversation: Conversation;
  view: View;
  onOpen: (call: ToolCall) => void;
  onAnswer: (approvalId: string, decision: "allowed" | "denied") => void;
  onAnswerQuestion: (questionId: string, answer: QuestionAnswer) => void;
  /** Opens another session, such as the one a task went to or came from. */
  onOpenSession: (id: string) => void;
  /** Starts a new session from this one's summary. */
  onCarryOn: () => void;
}

export function Transcript({ conversation, view, onOpen, onAnswer, onAnswerQuestion, onOpenSession, onCarryOn }: Props) {
  const { t } = useI18n();
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const blocks = shownBlocks(conversation.blocks, view);
  const lastMessage = [...conversation.blocks].reverse().find((block) => block.kind === "message");

  // Follow new content only while the user is at the bottom.
  useLayoutEffect(() => {
    const element = scroller.current;
    if (element && pinned.current) element.scrollTop = element.scrollHeight;
  });
  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const onScroll = () => {
      pinned.current = element.scrollHeight - element.scrollTop - element.clientHeight < 48;
    };
    element.addEventListener("scroll", onScroll, { passive: true });
    return () => element.removeEventListener("scroll", onScroll);
  }, []);

  const render = (block: ShownBlock, index: number) => {
    switch (block.kind) {
      case "user":
        return <UserBubble key={block.id} text={block.text} pending={block.pending} />;
      case "message":
        return (
          <MessageBubble key={block.id} text={block.text} name={conversation.character.name} first={startsGroup(blocks, index)} />
        );
      case "working":
        return <WorkingText key={block.id} text={block.text} />;
      case "thinking":
        return <Thinking key={block.id} seconds={block.seconds} />;
      case "tool":
        return <ToolRow key={block.id} call={block.call} onOpen={onOpen} />;
      case "tools":
        return <ToolGroup key={block.id} calls={block.calls} onOpen={onOpen} />;
      case "approval":
        return (
          <ApprovalCard
            key={block.id}
            request={block.request}
            character={conversation.character.name}
            onAnswer={(decision) => onAnswer(block.request.id, decision)}
          />
        );
      case "question":
        return (
          <QuestionCard
            key={block.id}
            question={block.question}
            character={conversation.character.name}
            onAnswer={(answer) => onAnswerQuestion(block.question.id, answer)}
          />
        );
      case "dispatch":
        return <DispatchCard key={block.id} tasks={block.tasks} onOpenSession={onOpenSession} />;
      case "received":
        return <ReceivedCard key={block.id} text={block.text} from={block.from} onOpenSession={onOpenSession} />;
      case "remembered":
        return <Remembered key={block.id} text={block.text} />;
      case "notice":
        return <Notice key={block.id} text={block.text} />;
      case "summarized":
        return <Summarized key={block.id} />;
      case "error":
        return <ErrorRow key={block.id} reason={block.reason} />;
      case "break":
        return <BreakCard key={block.id} />;
      case "archived":
        return <Archived key={block.id} reason={block.reason} idleMinutes={block.idleMinutes} onCarryOn={onCarryOn} />;
    }
  };

  return (
    <div className={styles.scroller} ref={scroller}>
      <div className={styles.column} data-view={view}>
        {blocks.map(render)}
        {conversation.activity && (
          <div className={styles.working} role="status">
            {/* The avatar shows what the turn waits for: an approval, an answer, a device, or nothing. */}
            <Avatar size={20} cue={characterState(conversation)} />
            <span>{conversation.activity.text ?? t.blocks.thinking}</span>
            <span className={styles.dots} aria-hidden>
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
      </div>
      <div className={styles.live} aria-live="polite">
        {lastMessage?.kind === "message" && !lastMessage.streaming ? lastMessage.text : ""}
      </div>
    </div>
  );
}
