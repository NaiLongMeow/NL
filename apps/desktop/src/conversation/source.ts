/**
 * Where sessions come from (UI design note, section 12: every screen reads
 * from and acts on an interface with a fake behind it, E2).
 *
 * The shape suits React's `useSyncExternalStore`: the source keeps the
 * current state, returns snapshots that only change when something changed,
 * and tells subscribers when that happens. Stage 1 uses the scripted fake in
 * fake.ts. Stage 3 implements the same interface on the harness's events,
 * without changing the screens.
 */

import type { Conversation, QuestionAnswer, Quote, SessionKind, SessionLink } from "./model";

/** A device of the account, as the sidebar groups sessions by it (note, section 5). */
export interface Device {
  /** The node id, such as "desktop3". */
  id: string;
  /** The name the user gave it. */
  name: string;
  type: "computer" | "phone" | "server" | "speaker";
  /** The device this window runs on. */
  self?: boolean;
  online: boolean;
}

/** What a live session is doing, for its status line in the sidebar (note, section 5). */
export type SessionStatus =
  | { kind: "working"; text: string }
  | { kind: "approval" }
  | { kind: "question" }
  | { kind: "device" }
  /** Idle, and archives itself in this many minutes (note, section 4.11). */
  | { kind: "idle"; archivesInMinutes: number };

/** A live session as the sidebar lists it. */
export interface SessionSummary {
  id: string;
  title: string;
  kind: SessionKind;
  /** The device of a device session, by its node id. */
  deviceId?: string;
  status: SessionStatus;
  acceptsTasks: boolean;
  /** The session a dispatched task came from. */
  from?: SessionLink;
}

/** A session in the archive: its summary, kept in the compacts folder (S3). */
export interface ArchivedSession {
  id: string;
  title: string;
  kind: SessionKind;
  /** The device of a device session, by its display name. */
  device?: string;
  /** When it was archived, already formatted ("2 h ago"). */
  when: string;
  reason: "ended" | "idle";
  /** The first lines of its summary. */
  summary: string;
}

export interface SessionSource {
  /** The account's devices, this one first. The same array until it changes. */
  devices(): readonly Device[];
  /** The live sessions of every device. The same array until the list changes. */
  list(): readonly SessionSummary[];
  /** The archive, newest first. The same array until it changes. */
  archive(): readonly ArchivedSession[];
  /** One session's conversation, live or archived. The same object until it changes. */
  conversation(id: string): Conversation | undefined;
  /** Calls `listener` after any change; returns a function that stops the calls. */
  subscribe(listener: () => void): () => void;
  /**
   * Sends the user's message, quoting a block when `quote` is given (note,
   * section 4.15). During a turn it cuts in at the turn's next step (the
   * default the user chose, note section 4.8). While a question waits, the
   * message is its answer, in the user's own words.
   */
  send(id: string, text: string, quote?: Quote): void;
  /** Stops the running turn (P7). */
  stop(id: string): void;
  /** Answers an approval request (T7). */
  answer(id: string, approvalId: string, decision: "allowed" | "denied"): void;
  /**
   * Answers the character's question, or skips it (note, section 4.13).
   * A message sent while a question waits answers it too (`send`).
   */
  answerQuestion(id: string, questionId: string, answer: QuestionAnswer): void;
  /** Lets other sessions dispatch tasks to this one, or stops them (note, section 4.10). */
  setAcceptsTasks(id: string, accepts: boolean): void;
  /** Ends the session at once (product rule 4): it is summarized and archived. */
  end(id: string): void;
  /** Starts a session; returns its id. */
  start(kind: SessionKind): string;
  /**
   * Starts a session from a summary of session `id` (note, section 4.15):
   * an archived session's summary from the archive (S5), or, for a live
   * session, one made now. The session itself stays as it is. Returns the
   * new session's id.
   */
  carryOn(id: string): string;
  /**
   * Starts a session that holds session `id`'s conversation as it is now,
   * on the same device; returns its id (note, section 4.15).
   */
  branch(id: string): string;
  /** Summarizes the session now (S5); nothing happens while a turn runs. */
  compact(id: string): void;
  rename(id: string, title: string): void;
  /**
   * Returns the session to the checkpoint before the block `blockId`, which
   * is the one before the block's step (note, section 4.16). A running turn
   * stops first. Nothing is removed from the record.
   */
  rewind(id: string, blockId: string): void;
  /** Sends `text` in place of the user's message `blockId`: a rewind to before it, then a send. */
  edit(id: string, blockId: string, text: string): void;
  /** Shows way `index` (from 0) of the ways the conversation went from the checkpoint `fork` ("" for the start). */
  showVersion(id: string, fork: string, index: number): void;
  /** Brings a rewound session back to the newest point after its checkpoint. */
  restore(id: string): void;
  /** How long an idle session waits before it archives itself, in minutes (note, section 4.11). */
  setIdleLimit(minutes: number): void;
}
