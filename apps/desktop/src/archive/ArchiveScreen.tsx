/**
 * The archive (UI design note, sections 4.11 and 5): the summaries of
 * sessions that were ended or archived themselves when idle, newest first.
 * A summary opens read-only; Carry on starts a new session from it (S5),
 * from its button or its menu (section 4.15).
 */

import { useState, useSyncExternalStore } from "react";
import { Laptop, Search, Users } from "lucide-react";
import { useI18n } from "../i18n/I18n";
import { Button } from "../ui/Button";
import type { SessionSource } from "../conversation/source";
import { ContextMenu, type MenuEntry } from "../ui/Menu";
import styles from "./ArchiveScreen.module.css";

interface Props {
  source: SessionSource;
  onOpenSession: (id: string) => void;
  /** An archived session's actions, for its menu. */
  menuFor: (id: string) => readonly MenuEntry[];
}

export function ArchiveScreen({ source, onOpenSession, menuFor }: Props) {
  const { t } = useI18n();
  const archive = useSyncExternalStore(source.subscribe, source.archive);
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const items = archive.filter(
    (item) => item.title.toLowerCase().includes(needle) || item.summary.toLowerCase().includes(needle),
  );
  return (
    <main className={styles.screen} aria-label={t.archive.title}>
      <div className={styles.column}>
        <p className={styles.intro}>{t.archive.intro}</p>
        <label className={styles.search}>
          <Search aria-hidden />
          <input
            type="search"
            placeholder={t.archive.search}
            aria-label={t.archive.search}
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {items.length === 0 ? (
          <p className={styles.empty}>{archive.length === 0 ? t.archive.empty : t.archive.noMatch}</p>
        ) : (
          <ul className={styles.items}>
            {items.map((item) => (
              <li key={item.id} className={styles.item}>
                <ContextMenu entries={menuFor(item.id)}>
                  <button type="button" className={styles.open} onClick={() => onOpenSession(item.id)}>
                    <span className={styles.title}>{item.title}</span>
                    <span className={styles.meta}>
                      {item.kind === "shared" ? <Users aria-hidden /> : <Laptop aria-hidden />}
                      {item.kind === "shared" ? t.header.shared : item.device}
                      {` · ${item.when} · ${item.reason === "idle" ? t.archive.idle : t.archive.ended}`}
                    </span>
                    <span className={styles.summary}>{item.summary}</span>
                  </button>
                </ContextMenu>
                <Button size="sm" onClick={() => onOpenSession(source.carryOn(item.id))}>
                  {t.archive.carryOn}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
