/**
 * A session's settings (UI design note, section 4.15): its title, which is
 * where renaming lives, and whether other sessions may dispatch tasks to it
 * (4.10). Nothing changes until Save; Cancel, Esc, and a click outside leave
 * the session as it was.
 */

import { useState } from "react";
import { Dialog } from "radix-ui";
import { useI18n } from "../i18n/I18n";
import { Button } from "../ui/Button";
import { Switch } from "../ui/Switch";
import type { Conversation } from "./model";
import styles from "./SessionSettings.module.css";

export function SessionSettings({
  conversation,
  onClose,
  onSave,
}: {
  conversation: Conversation;
  onClose: () => void;
  onSave: (title: string, acceptsTasks: boolean) => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState(conversation.title);
  const [acceptsTasks, setAcceptsTasks] = useState(conversation.acceptsTasks);
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.dialog} aria-describedby={undefined}>
          <Dialog.Title className={styles.title}>{t.sessionSettings.title}</Dialog.Title>
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              if (title.trim()) onSave(title.trim(), acceptsTasks);
            }}
          >
            <label className={styles.field}>
              <span>{t.sessionSettings.name}</span>
              <input value={title} autoComplete="off" onChange={(event) => setTitle(event.target.value)} />
            </label>
            <div className={styles.option}>
              <Switch label={t.header.acceptTasks} checked={acceptsTasks} onChange={setAcceptsTasks} />
              <p className={styles.hint}>{t.header.acceptTasksHint}</p>
            </div>
            <div className={styles.buttons}>
              <Dialog.Close asChild>
                <Button>{t.sessionSettings.cancel}</Button>
              </Dialog.Close>
              <Button type="submit" variant="primary" disabled={title.trim() === ""}>
                {t.sessionSettings.save}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
