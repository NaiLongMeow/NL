/**
 * The main window's sidebar (UI design note, section 5): New conversation,
 * search, the conversation list in three groups, and the other screens.
 *
 * - Running: conversations open on this or another device, with a dot
 *   while a turn runs.
 * - Carry on: summaries saved by any device, to continue from (S5).
 * - Recent: closed conversations of this device.
 */

import { useSyncExternalStore } from "react";
import { ChartColumn, Brain, MonitorSmartphone, Search, Settings, SquarePen, Wrench } from "lucide-react";
import { useI18n } from "../i18n/I18n";
import type { ConversationGroup, ConversationSource, ConversationSummary } from "../conversation/source";
import styles from "./Sidebar.module.css";

const GROUPS: ConversationGroup[] = ["running", "carry-on", "recent"];

interface Props {
  source: ConversationSource;
  selected: string;
  onSelect: (id: string) => void;
}

export function Sidebar({ source, selected, onSelect }: Props) {
  const { t } = useI18n();
  const list = useSyncExternalStore(source.subscribe, source.list);
  const heading: Record<ConversationGroup, string> = {
    running: t.sidebar.running,
    "carry-on": t.sidebar.carryOn,
    recent: t.sidebar.recent,
  };
  const nav = [
    { label: t.sidebar.memory, icon: <Brain /> },
    { label: t.sidebar.tools, icon: <Wrench /> },
    { label: t.sidebar.devices, icon: <MonitorSmartphone /> },
    { label: t.sidebar.usage, icon: <ChartColumn /> },
    { label: t.sidebar.settings, icon: <Settings /> },
  ];

  return (
    <nav className={styles.sidebar} aria-label={t.app.name}>
      <div className={styles.top}>
        <button type="button" className={styles.newConversation}>
          <SquarePen aria-hidden />
          {t.sidebar.newConversation}
        </button>
        <label className={styles.search}>
          <Search aria-hidden />
          <input type="search" placeholder={t.sidebar.search} aria-label={t.sidebar.search} />
        </label>
      </div>
      <div className={styles.list}>
        {GROUPS.map((group) => {
          const items = list.filter((item) => item.group === group);
          if (items.length === 0) return null;
          return (
            <section key={group} className={styles.group}>
              <h2 className={styles.heading}>{heading[group]}</h2>
              <ul>
                {items.map((item) => (
                  <li key={item.id}>
                    <Item item={item} selected={item.id === selected} onSelect={onSelect} activity={t.sidebar.activity} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <ul className={styles.nav}>
        {nav.map((entry) => (
          <li key={entry.label}>
            <button type="button" className={styles.navItem}>
              {entry.icon}
              {entry.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Item({
  item,
  selected,
  onSelect,
  activity,
}: {
  item: ConversationSummary;
  selected: boolean;
  onSelect: (id: string) => void;
  activity: string;
}) {
  return (
    <button
      type="button"
      className={styles.item}
      aria-current={selected ? "page" : undefined}
      onClick={() => onSelect(item.id)}
    >
      <span className={styles.itemTitle}>
        {item.title}
        {item.active && <span className={styles.activity} role="img" aria-label={activity} />}
      </span>
      <span className={styles.itemMeta}>
        {item.device}
        {item.when ? ` · ${item.when}` : ""}
      </span>
    </button>
  );
}
