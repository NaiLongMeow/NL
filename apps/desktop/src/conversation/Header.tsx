/**
 * A session's header, shown in the window's title bar (UI design note,
 * sections 4.9 and 5): the character with its "AI" tag (product rule 5) and
 * current cue, the session's title, its kind (shared, or the device it
 * belongs to), the session a dispatched task came from or the one it
 * branched or carried on from, the Accept tasks and Show work switches, End
 * session, and a menu with the session's actions (section 4.15), Export as
 * JSONL, and developer details.
 *
 * The title bar is a drag region, so every control here is a button or a
 * switch, which the title bar's CSS marks as not draggable.
 */

import { Code, CircleStop, CornerDownRight, Download, Ellipsis, GitBranch, Laptop, MessageSquarePlus, Users } from "lucide-react";
import { DropdownMenu, Tooltip } from "radix-ui";
import type { ReactNode } from "react";
import { useI18n } from "../i18n/I18n";
import { Avatar } from "../ui/Avatar";
import { IconButton } from "../ui/Button";
import { DropdownEntries, menuStyles, type MenuEntry } from "../ui/Menu";
import { Switch } from "../ui/Switch";
import { characterState, type Conversation, type View } from "./model";
import type { SessionSource } from "./source";
import styles from "./Header.module.css";

interface Props {
  source: SessionSource;
  conversation: Conversation;
  view: View;
  onViewChange: (view: View) => void;
  developerDetails: boolean;
  onDeveloperDetailsChange: (on: boolean) => void;
  onOpenSession: (id: string) => void;
  /** The session's actions, the same as its menu in the sidebar (section 4.15). */
  menu: readonly MenuEntry[];
}

/** A small label with a tooltip that says what it means. */
function Chip({ icon, hint, children }: { icon: ReactNode; hint: string; children: ReactNode }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span className={styles.chip} tabIndex={0} role="note" aria-label={hint}>
          {icon}
          {children}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className={styles.tooltip} sideOffset={6}>
          {hint}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function Header({ source, conversation, view, onViewChange, developerDetails, onDeveloperDetailsChange, onOpenSession, menu }: Props) {
  const { t } = useI18n();
  const live = !conversation.archived;
  const { origin } = conversation;
  return (
    <div className={styles.header}>
      <div className={styles.identity}>
        <Avatar size={22} cue={characterState(conversation)} />
        <span className={styles.name}>{conversation.character.name}</span>
        <span className={styles.ai} aria-label={t.header.aiLabel}>
          {t.header.ai}
        </span>
        <span className={styles.title}>{conversation.title}</span>
        {conversation.kind === "shared" ? (
          <Chip icon={<Users aria-hidden />} hint={t.header.sharedHint}>
            {t.header.shared}
          </Chip>
        ) : (
          <Chip icon={<Laptop aria-hidden />} hint={t.header.deviceHint(conversation.device ?? "")}>
            {conversation.device}
          </Chip>
        )}
        {conversation.from && (
          <button type="button" className={styles.from} onClick={() => onOpenSession(conversation.from!.id)}>
            <CornerDownRight aria-hidden />
            <span>{t.header.from(conversation.from.title)}</span>
          </button>
        )}
        {origin && (
          <button type="button" className={styles.from} onClick={() => onOpenSession(origin.session.id)}>
            {origin.kind === "branch" ? <GitBranch aria-hidden /> : <MessageSquarePlus aria-hidden />}
            <span>{origin.kind === "branch" ? t.header.branchOf(origin.session.title) : t.header.carriedFrom(origin.session.title)}</span>
          </button>
        )}
      </div>
      <div className={styles.actions}>
        {live && (
          <span className={styles.acceptTasks} title={t.header.acceptTasksHint}>
            <Switch
              label={t.header.acceptTasks}
              checked={conversation.acceptsTasks}
              onChange={(on) => source.setAcceptsTasks(conversation.id, on)}
            />
          </span>
        )}
        <Switch label={t.header.showWork} checked={view === "full"} onChange={(on) => onViewChange(on ? "full" : "chat")} />
        {live && (
          <IconButton label={t.header.endSession} size="sm" onClick={() => source.end(conversation.id)}>
            <CircleStop />
          </IconButton>
        )}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <IconButton label={t.header.more} size="sm">
              <Ellipsis />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className={menuStyles.menu} align="end" sideOffset={6}>
              <DropdownEntries entries={menu} />
              {menu.length > 0 && <DropdownMenu.Separator className={menuStyles.separator} />}
              <DropdownMenu.Item className={menuStyles.item}>
                <Download />
                <span>{t.header.exportJsonl}</span>
              </DropdownMenu.Item>
              <DropdownMenu.CheckboxItem
                className={menuStyles.item}
                checked={developerDetails}
                onCheckedChange={onDeveloperDetailsChange}
              >
                <Code />
                <span>{t.header.developerDetails}</span>
                <DropdownMenu.ItemIndicator className={menuStyles.check}>✓</DropdownMenu.ItemIndicator>
              </DropdownMenu.CheckboxItem>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  );
}
