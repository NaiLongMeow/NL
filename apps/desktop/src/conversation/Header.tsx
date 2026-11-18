/**
 * A session's header, shown in the window's title bar (UI design note,
 * sections 4.9 and 5): the character with its "AI" tag (product rule 5) and
 * current cue, the session's title, its kind (shared, or the device it
 * belongs to), the session a dispatched task came from, the Accept tasks and
 * Show work switches, End session, and a menu.
 *
 * The title bar is a drag region, so every control here is a button or a
 * switch, which the title bar's CSS marks as not draggable.
 */

import { CircleStop, CornerDownRight, Ellipsis, Laptop, Users } from "lucide-react";
import { DropdownMenu, Tooltip } from "radix-ui";
import type { ReactNode } from "react";
import { useI18n } from "../i18n/I18n";
import { Avatar } from "../ui/Avatar";
import { IconButton } from "../ui/Button";
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

export function Header({ source, conversation, view, onViewChange, developerDetails, onDeveloperDetailsChange, onOpenSession }: Props) {
  const { t } = useI18n();
  const live = !conversation.archived;
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
            <DropdownMenu.Content className={styles.menu} align="end" sideOffset={6}>
              <DropdownMenu.Item className={styles.item}>{t.header.rename}</DropdownMenu.Item>
              <DropdownMenu.Item className={styles.item}>{t.header.compactNow}</DropdownMenu.Item>
              <DropdownMenu.Item className={styles.item}>{t.header.exportJsonl}</DropdownMenu.Item>
              <DropdownMenu.Separator className={styles.separator} />
              <DropdownMenu.CheckboxItem
                className={styles.item}
                checked={developerDetails}
                onCheckedChange={onDeveloperDetailsChange}
              >
                {t.header.developerDetails}
                <DropdownMenu.ItemIndicator className={styles.check}>✓</DropdownMenu.ItemIndicator>
              </DropdownMenu.CheckboxItem>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  );
}
