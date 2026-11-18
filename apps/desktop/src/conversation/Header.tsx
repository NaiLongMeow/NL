/**
 * A conversation's header (UI design note, section 4.9): the character with
 * its "AI" tag (product rule 5) and current cue, the title, the device the
 * conversation runs on, the "Show work" switch between full and chat view,
 * End conversation, and a menu.
 */

import { CircleStop, Ellipsis, Monitor } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useI18n } from "../i18n/I18n";
import { Avatar } from "../ui/Avatar";
import { Button, IconButton } from "../ui/Button";
import { Switch } from "../ui/Switch";
import type { Conversation, View } from "./model";
import styles from "./Header.module.css";

interface Props {
  conversation: Conversation;
  view: View;
  onViewChange: (view: View) => void;
  developerDetails: boolean;
  onDeveloperDetailsChange: (on: boolean) => void;
}

export function Header({ conversation, view, onViewChange, developerDetails, onDeveloperDetailsChange }: Props) {
  const { t } = useI18n();
  return (
    <header className={styles.header}>
      <div className={styles.identity}>
        <Avatar size={28} cue={conversation.activity ? "working" : "idle"} />
        <span className={styles.name}>{conversation.character.name}</span>
        <span className={styles.ai} aria-label={t.header.aiLabel}>
          {t.header.ai}
        </span>
        <span className={styles.title}>{conversation.title}</span>
        <span className={styles.device}>
          <Monitor aria-hidden />
          {conversation.device}
        </span>
      </div>
      <div className={styles.actions}>
        <Switch label={t.header.showWork} checked={view === "full"} onChange={(on) => onViewChange(on ? "full" : "chat")} />
        <Button size="sm" variant="ghost" icon={<CircleStop />}>
          {t.header.endConversation}
        </Button>
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
    </header>
  );
}
