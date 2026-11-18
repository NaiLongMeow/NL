/**
 * The main window's sidebar (UI design note, section 5): search, the live
 * sessions, and the other screens. New session sits in the title bar.
 *
 * Sessions are short-lived (section 4.10): the list holds only live ones,
 * in two groups, and an idle session leaves it when it archives itself.
 *
 * - Shared sessions, which every device can open.
 * - Device sessions, under the device each belongs to, this one first; the
 *   sessions of an offline device are dimmed.
 *
 * Each row shows the title and one status line: what the session is doing,
 * that it waits for approval, for an answer, or for its device, or that it
 * is idle, with the archive countdown, and for a dispatched task, where it
 * came from.
 */

import { useState, useSyncExternalStore, type ReactNode } from "react";
import {
  Archive,
  Brain,
  ChartColumn,
  Laptop,
  MonitorSmartphone,
  Search,
  Server,
  Settings,
  MessageCircleQuestionMark,
  ShieldQuestionMark,
  Smartphone,
  Speaker,
  WifiOff,
  Wrench,
} from "lucide-react";
import { useI18n } from "../i18n/I18n";
import type { Device, SessionSource, SessionSummary } from "../conversation/source";
import styles from "./Sidebar.module.css";

/** The screens of the main window besides a session (section 5). */
export type Screen = "session" | "archive" | "memory" | "tools" | "devices" | "usage" | "settings";

interface Props {
  source: SessionSource;
  /** The open session, when the session screen is shown. */
  selected: string | undefined;
  screen: Screen;
  onSelect: (id: string) => void;
  onScreen: (screen: Screen) => void;
}

const DEVICE_ICONS: Record<Device["type"], ReactNode> = {
  computer: <Laptop aria-hidden />,
  phone: <Smartphone aria-hidden />,
  server: <Server aria-hidden />,
  speaker: <Speaker aria-hidden />,
};

export function Sidebar({ source, selected, screen, onSelect, onScreen }: Props) {
  const { t } = useI18n();
  const devices = useSyncExternalStore(source.subscribe, source.devices);
  const list = useSyncExternalStore(source.subscribe, source.list);
  const archive = useSyncExternalStore(source.subscribe, source.archive);
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const matches = (item: SessionSummary) => item.title.toLowerCase().includes(needle);
  const shared = list.filter((item) => item.kind === "shared" && matches(item));
  const byDevice = devices
    .map((device) => ({ device, sessions: list.filter((item) => item.kind === "device" && item.deviceId === device.id && matches(item)) }))
    .filter((group) => group.sessions.length > 0);
  const current = (id: string) => screen === "session" && id === selected;

  const nav: Array<{ screen: Screen; label: string; icon: ReactNode; count?: number }> = [
    { screen: "archive", label: t.sidebar.archive, icon: <Archive aria-hidden />, count: archive.length },
    { screen: "memory", label: t.sidebar.memory, icon: <Brain aria-hidden /> },
    { screen: "tools", label: t.sidebar.tools, icon: <Wrench aria-hidden /> },
    { screen: "devices", label: t.sidebar.devicesScreen, icon: <MonitorSmartphone aria-hidden /> },
    { screen: "usage", label: t.sidebar.usage, icon: <ChartColumn aria-hidden /> },
    { screen: "settings", label: t.sidebar.settings, icon: <Settings aria-hidden /> },
  ];

  return (
    <nav className={styles.sidebar} aria-label={t.sidebar.label}>
      <div className={styles.top}>
        <label className={styles.search}>
          <Search aria-hidden />
          <input
            type="search"
            placeholder={t.sidebar.search}
            aria-label={t.sidebar.search}
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      <div className={styles.list}>
        {shared.length > 0 && (
          <section className={styles.group} aria-label={t.sidebar.shared}>
            <h2 className={styles.heading}>{t.sidebar.shared}</h2>
            <ul>
              {shared.map((item) => (
                <li key={item.id}>
                  <Row item={item} current={current(item.id)} onSelect={onSelect} />
                </li>
              ))}
            </ul>
          </section>
        )}
        {byDevice.length > 0 && (
          <section className={styles.group} aria-label={t.sidebar.devices}>
            <h2 className={styles.heading}>{t.sidebar.devices}</h2>
            {byDevice.map(({ device, sessions }) => (
              <div key={device.id} className={styles.device} data-offline={!device.online || undefined}>
                <h3 className={styles.deviceName}>
                  {DEVICE_ICONS[device.type]}
                  <span className={styles.deviceLabel}>{device.name}</span>
                  {device.self && <span className={styles.tag}>{t.sidebar.thisDevice}</span>}
                  {!device.online && <span className={styles.tag}>{t.sidebar.offline}</span>}
                </h3>
                <ul>
                  {sessions.map((item) => (
                    <li key={item.id}>
                      <Row item={item} current={current(item.id)} onSelect={onSelect} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}
        {needle && shared.length === 0 && byDevice.length === 0 && <p className={styles.empty}>{t.sidebar.noMatch}</p>}
      </div>
      <ul className={styles.nav}>
        {nav.map((entry) => (
          <li key={entry.screen}>
            <button
              type="button"
              className={styles.navItem}
              aria-current={screen === entry.screen ? "page" : undefined}
              onClick={() => onScreen(entry.screen)}
            >
              {entry.icon}
              <span className={styles.navLabel}>{entry.label}</span>
              {entry.count !== undefined && <span className={styles.count}>{entry.count}</span>}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Row({ item, current, onSelect }: { item: SessionSummary; current: boolean; onSelect: (id: string) => void }) {
  const { t } = useI18n();
  const { status } = item;
  let line: ReactNode;
  switch (status.kind) {
    case "working":
      line = (
        <>
          <span className={styles.activity} aria-hidden />
          {status.text}
        </>
      );
      break;
    case "approval":
      line = (
        <>
          <ShieldQuestionMark className={styles.attention} aria-hidden />
          {t.sidebar.approval}
        </>
      );
      break;
    case "question":
      line = (
        <>
          <MessageCircleQuestionMark className={styles.attention} aria-hidden />
          {t.sidebar.question}
        </>
      );
      break;
    case "device":
      line = (
        <>
          <WifiOff aria-hidden />
          {t.sidebar.waitingForDevice}
        </>
      );
      break;
    case "idle":
      line = t.sidebar.idle(status.archivesInMinutes);
      break;
  }
  return (
    <button type="button" className={styles.item} aria-current={current ? "page" : undefined} onClick={() => onSelect(item.id)}>
      <span className={styles.itemTitle}>{item.title}</span>
      <span className={styles.itemMeta} data-status={status.kind}>
        {line}
        {item.from && <span className={styles.from}> · {t.sidebar.from(item.from.title)}</span>}
      </span>
    </button>
  );
}
