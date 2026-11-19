/**
 * A session's actions (UI design note, section 4.15), built once and shared
 * by its row in the sidebar, its entry in the archive, and the header's
 * menu: Branch, Carry on, Summarize now (not while a turn runs or waits for
 * an approval, an answer, or its device), Settings, and Archive, which is
 * End session. An archived session can only be carried on.
 */

import { Archive, GitBranch, ListCollapse, MessageSquarePlus, Settings2 } from "lucide-react";
import type { Messages } from "../i18n/messages";
import { menuItem, separator, type MenuEntry } from "../ui/Menu";
import { characterState } from "./model";
import type { SessionSource } from "./source";

export function sessionMenu(
  source: SessionSource,
  t: Messages,
  id: string,
  /** Opens a session, such as a new branch; opens the settings dialog of a session. */
  on: { open: (id: string) => void; settings: (id: string) => void },
): MenuEntry[] {
  const session = source.conversation(id);
  if (!session) return [];
  const carryOn = menuItem(t.menu.carryOn, <MessageSquarePlus />, () => on.open(source.carryOn(id)));
  if (session.archived) return [carryOn];
  return [
    menuItem(t.menu.branch, <GitBranch />, () => on.open(source.branch(id))),
    carryOn,
    menuItem(t.menu.summarize, <ListCollapse />, () => source.compact(id), characterState(session) !== "idle"),
    menuItem(t.menu.settings, <Settings2 />, () => on.settings(id)),
    separator,
    menuItem(t.menu.archive, <Archive />, () => source.end(id)),
  ];
}
