/**
 * Messages that arrive while NL is not in front (UI design note, section
 * 4.14).
 *
 * *(user, 2026-11-19)* A message the character sends (the message tool, M5)
 * while the main window does not have the focus, because another app is in
 * front or the window is minimized or hidden, also reaches the user outside
 * the window: as a bubble beside the pet when the pet is shown, and as a
 * system notification otherwise, if notifications are on, which they are
 * until the user turns them off. With the main window in front, the session
 * shows the message and nothing else does.
 *
 * Only the messages of this device's own sessions and of shared sessions
 * count: another device's session reaches the user through that device.
 */

import type { Block } from "../conversation/model";
import type { SessionSource } from "../conversation/source";

/** Where a message that arrives now goes, besides its session. */
export type Delivery = "none" | "pet" | "notification";

export function deliveryFor(state: { focused: boolean; petShown: boolean; notifications: boolean }): Delivery {
  if (state.focused) return "none";
  if (state.petShown) return "pet";
  return state.notifications ? "notification" : "none";
}

/** A message that has just arrived. */
export interface Arrival {
  session: string;
  id: string;
  text: string;
}

/**
 * The finished messages of these sessions that are not in `seen`, oldest
 * first; `seen` then holds them too. A message still streaming waits until
 * it has finished.
 */
export function newMessages(seen: Set<string>, sessions: Iterable<{ id: string; blocks: readonly Block[] }>): Arrival[] {
  const arrivals: Arrival[] = [];
  for (const session of sessions) {
    for (const block of session.blocks) {
      if (block.kind !== "message" || block.streaming || seen.has(block.id)) continue;
      seen.add(block.id);
      arrivals.push({ session: session.id, id: block.id, text: block.text });
    }
  }
  return arrivals;
}

/**
 * Calls `onMessage` for every message that arrives from now on in this
 * device's sessions and in shared sessions; the messages already there are
 * history. Returns the function that stops the calls.
 */
export function watchMessages(source: SessionSource, onMessage: (arrival: Arrival) => void): () => void {
  const seen = new Set<string>();
  const sessions = () => {
    const self = source.devices().find((device) => device.self)?.id;
    return source
      .list()
      .filter((summary) => summary.kind === "shared" || summary.deviceId === self)
      .flatMap((summary) => {
        const conversation = source.conversation(summary.id);
        return conversation ? [{ id: summary.id, blocks: conversation.blocks }] : [];
      });
  };
  newMessages(seen, sessions());
  return source.subscribe(() => {
    for (const arrival of newMessages(seen, sessions())) onMessage(arrival);
  });
}
