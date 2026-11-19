/**
 * The scrolling column of a session: its blocks for the chosen view, then
 * the working indicator while a turn runs (UI design note, sections 4.1 to
 * 4.12).
 *
 * The view stays at the bottom as content arrives unless the user has
 * scrolled up. Screen readers hear each finished message through the polite
 * live region, not every streamed character.
 *
 * Messages, the user's messages, working text, thinking, and tool rows have
 * menus (section 4.15): Copy everywhere; in a live session also Quote,
 * Edit on the user's own messages, and Rewind to before this (4.16). Where
 * the path forks, a versions row switches ways; after a rewind, a marker
 * offers Restore.
 */

import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Copy, Pencil, TextQuote, Undo2 } from "lucide-react";
import { useI18n } from "../i18n/I18n";
import { Avatar } from "../ui/Avatar";
import { ContextMenu, menuItem, separator, type MenuEntry } from "../ui/Menu";
import {
  Archived,
  BreakCard,
  ErrorRow,
  MessageBubble,
  Notice,
  Remembered,
  Rewound,
  Summarized,
  Thinking,
  UserBubble,
  UserEditor,
  Versions,
  WorkingText,
} from "./Blocks";
import { ApprovalCard, DispatchCard, QuestionCard, ReceivedCard } from "./Cards";
import {
  characterState,
  shownBlocks,
  startsGroup,
  toolDisplayName,
  type Conversation,
  type QuestionAnswer,
  type Quote,
  type ShownBlock,
  type ToolCall,
  type View,
} from "./model";
import { ToolGroup, ToolRow } from "./ToolRow";
import styles from "./Transcript.module.css";

/** What the blocks' menus and rows do in a live session (sections 4.15 and 4.16). */
export interface BlockActions {
  quote: (quote: Quote) => void;
  edit: (blockId: string, text: string) => void;
  rewind: (blockId: string) => void;
  showVersion: (fork: string, index: number) => void;
  restore: () => void;
}

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
  /** Absent for an archived session, whose blocks offer Copy only. */
  actions?: BlockActions;
}

/** The text selected inside `element`, when the whole selection is inside it. */
function selectionWithin(element: HTMLElement): string {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return "";
  return element.contains(selection.anchorNode) && element.contains(selection.focusNode) ? selection.toString() : "";
}

/**
 * A block with its menu: Copy, when the block has text, and `entries`. Copy
 * takes the text the user selected inside the block when they opened the
 * menu, and the whole text otherwise.
 */
function BlockMenu({ copy, entries, children }: { copy?: string; entries: readonly MenuEntry[]; children: ReactNode }) {
  const { t } = useI18n();
  const selected = useRef("");
  const all = [
    ...(copy === undefined ? [] : [menuItem(t.menu.copy, <Copy />, () => void navigator.clipboard.writeText(selected.current || copy))]),
    ...entries,
  ];
  return (
    <ContextMenu entries={all} onOpen={(event) => (selected.current = selectionWithin(event.currentTarget))}>
      {children}
    </ContextMenu>
  );
}

export function Transcript({ conversation, view, onOpen, onAnswer, onAnswerQuestion, onOpenSession, onCarryOn, actions }: Props) {
  const { t } = useI18n();
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const [editing, setEditing] = useState<string>();
  const blocks = shownBlocks(conversation.blocks, view);
  const lastMessage = [...conversation.blocks].reverse().find((block) => block.kind === "message");
  const character = conversation.character.name;

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

  const toolText = (call: ToolCall) =>
    [
      toolDisplayName(call.name),
      call.input && `${t.blocks.input}\n${call.input}`,
      call.output && `${t.blocks.output}\n${call.output}`,
    ]
      .filter(Boolean)
      .join("\n\n");

  /** The menu of a block that has one: what Copy copies, and the other entries. */
  const menuOf = (block: ShownBlock): { copy?: string; entries: MenuEntry[] } | undefined => {
    const rewind = (id: string) => (actions ? [separator, menuItem(t.menu.rewind, <Undo2 />, () => actions.rewind(id))] : []);
    const quote = (from: Quote["from"], text: string) => (actions ? [menuItem(t.menu.quote, <TextQuote />, () => actions.quote({ from, text }))] : []);
    switch (block.kind) {
      case "user":
        return {
          copy: block.text,
          entries: [
            ...quote("user", block.text),
            ...(actions ? [menuItem(t.menu.edit, <Pencil />, () => setEditing(block.id))] : []),
            ...rewind(block.id),
          ],
        };
      case "message":
        return { copy: block.text, entries: [...quote("character", block.text), ...rewind(block.id)] };
      case "working":
        return { copy: block.text, entries: [...quote("character", block.text), ...rewind(block.id)] };
      case "thinking":
        return actions ? { entries: [menuItem(t.menu.rewind, <Undo2 />, () => actions.rewind(block.id))] } : undefined;
      case "tool":
        return { copy: toolText(block.call), entries: rewind(block.id) };
      case "tools":
        return { copy: block.calls.map(toolText).join("\n\n"), entries: rewind(block.calls[0]!.id) };
      default:
        return undefined;
    }
  };

  const render = (block: ShownBlock, index: number): ReactNode => {
    switch (block.kind) {
      case "user":
        return editing === block.id && actions ? (
          <UserEditor
            text={block.text}
            onCancel={() => setEditing(undefined)}
            onSend={(text) => {
              setEditing(undefined);
              actions.edit(block.id, text);
            }}
          />
        ) : (
          <UserBubble text={block.text} pending={block.pending} quote={block.quote} character={character} />
        );
      case "message":
        return <MessageBubble text={block.text} name={character} first={startsGroup(blocks, index)} />;
      case "working":
        return <WorkingText text={block.text} />;
      case "thinking":
        return <Thinking seconds={block.seconds} />;
      case "tool":
        return <ToolRow call={block.call} onOpen={onOpen} />;
      case "tools":
        return <ToolGroup calls={block.calls} onOpen={onOpen} />;
      case "approval":
        return (
          <ApprovalCard request={block.request} character={character} onAnswer={(decision) => onAnswer(block.request.id, decision)} />
        );
      case "question":
        return (
          <QuestionCard
            question={block.question}
            character={character}
            onAnswer={(answer) => onAnswerQuestion(block.question.id, answer)}
          />
        );
      case "dispatch":
        return <DispatchCard tasks={block.tasks} onOpenSession={onOpenSession} />;
      case "received":
        return <ReceivedCard text={block.text} from={block.from} onOpenSession={onOpenSession} />;
      case "remembered":
        return <Remembered text={block.text} />;
      case "notice":
        return <Notice text={block.text} />;
      case "summarized":
        return <Summarized />;
      case "error":
        return <ErrorRow reason={block.reason} />;
      case "break":
        return <BreakCard />;
      case "archived":
        return <Archived reason={block.reason} idleMinutes={block.idleMinutes} onCarryOn={onCarryOn} />;
      case "versions":
        return (
          <Versions
            index={block.index}
            count={block.count}
            align={blocks[index + 1]?.kind === "user" ? "end" : "start"}
            onShow={(way) => actions?.showVersion(block.fork, way)}
          />
        );
      case "rewound":
        return <Rewound onRestore={() => actions?.restore()} />;
    }
  };

  const item = (block: ShownBlock, index: number) => {
    const menu = editing === block.id ? undefined : menuOf(block);
    const element = render(block, index);
    return menu ? (
      <BlockMenu key={block.id} copy={menu.copy} entries={menu.entries}>
        {element}
      </BlockMenu>
    ) : (
      <Fragment key={block.id}>{element}</Fragment>
    );
  };

  return (
    <div className={styles.scroller} ref={scroller}>
      <div className={styles.column} data-view={view}>
        {blocks.map(item)}
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
