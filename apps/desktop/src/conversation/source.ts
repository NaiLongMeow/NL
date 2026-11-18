/**
 * Where conversations come from (UI design note, section 12: every screen
 * reads from and acts on an interface with a fake behind it, E2).
 *
 * The shape suits React's `useSyncExternalStore`: the source keeps the
 * current state, returns snapshots that only change when something changed,
 * and tells subscribers when that happens. Stage 1 uses the scripted fake in
 * fake.ts. Stage 3 implements the same interface on the harness's events,
 * without changing the screens.
 */

import type { Conversation } from "./model";

export type ConversationGroup = "running" | "carry-on" | "recent";

/** A conversation as the sidebar lists it (note, section 5). */
export interface ConversationSummary {
  id: string;
  title: string;
  group: ConversationGroup;
  /** The device it runs on, or that saved its summary. */
  device: string;
  /** When it was last active, already formatted ("2 h ago"). */
  when?: string;
  /** A turn is running in it right now. */
  active?: boolean;
}

export interface ConversationSource {
  /** The conversations for the sidebar. The same array until the list changes. */
  list(): readonly ConversationSummary[];
  /** One conversation's current state. The same object until it changes. */
  conversation(id: string): Conversation | undefined;
  /** Calls `listener` after any change; returns a function that stops the calls. */
  subscribe(listener: () => void): () => void;
  /**
   * Sends the user's message. During a turn it cuts in at the turn's next
   * step (the default the user chose, note section 4.8).
   */
  send(id: string, text: string): void;
  /** Stops the running turn (P7). */
  stop(id: string): void;
  /** Answers an approval request (T7). */
  answer(id: string, approvalId: string, decision: "allowed" | "denied"): void;
}
