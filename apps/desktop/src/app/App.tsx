/**
 * The main window (UI design note, section 5): the title bar, the sidebar,
 * the open screen (a session, the archive, or settings), and the detail
 * panel, which opens when a tool call is opened and can be pinned.
 *
 * Stage 1 runs on the scripted fake source. The appearance, the interface
 * language, and the idle time are real settings, kept on this device.
 */

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Tooltip } from "radix-ui";
import { ArchiveScreen } from "../archive/ArchiveScreen";
import { ConversationScreen } from "../conversation/ConversationScreen";
import { DEFAULT_IDLE_LIMIT, createFakeSource } from "../conversation/fake";
import { Header } from "../conversation/Header";
import type { SessionKind, ToolCall, View } from "../conversation/model";
import { DetailPanel } from "../detail/DetailPanel";
import { I18nProvider, useI18n } from "../i18n/I18n";
import { IDLE_LIMITS, SettingsScreen } from "../settings/SettingsScreen";
import { Sidebar, type Screen } from "../sidebar/Sidebar";
import { applyCustomCss, useAppearance } from "./appearance";
import { customThemes, openCustomThemesFolder, syncCaption, watchTitlebar, type CustomThemes } from "./native";
import { ScreenTitle, TitleBar } from "./TitleBar";
import styles from "./App.module.css";

export function App() {
  return (
    <I18nProvider>
      <Tooltip.Provider delayDuration={400}>
        <MainWindow />
      </Tooltip.Provider>
    </I18nProvider>
  );
}

/** Where the idle time is kept. */
const IDLE_LIMIT_KEY = "nl.idleLimit";

function storedIdleLimit(): number {
  const value = Number(globalThis.localStorage?.getItem(IDLE_LIMIT_KEY));
  return (IDLE_LIMITS as readonly number[]).includes(value) ? value : DEFAULT_IDLE_LIMIT;
}

/** Below the "medium" breakpoint the sidebar starts closed (--nl-breakpoint-medium). */
const MEDIUM_WIDTH = 720;

function MainWindow() {
  const { t, locale } = useI18n();
  const source = useMemo(() => createFakeSource(locale), [locale]);
  const { appearance, mode, setAppearance } = useAppearance();
  const [custom, setCustom] = useState<CustomThemes | null>(null);
  const [idleLimit, setIdleLimit] = useState(storedIdleLimit);
  const [screen, setScreen] = useState<Screen>("session");
  const [selected, setSelected] = useState("errands");
  const [sidebarOpen, setSidebarOpen] = useState(() => (globalThis.innerWidth ?? MEDIUM_WIDTH) >= MEDIUM_WIDTH);
  // Full view is the desktop default (note, section 4.1).
  const [view, setView] = useState<View>("full");
  const [developerDetails, setDeveloperDetails] = useState(false);
  const [detail, setDetail] = useState<{ open: boolean; pinned: boolean; call?: ToolCall }>({ open: false, pinned: false });
  const conversation = useSyncExternalStore(source.subscribe, () => source.conversation(selected));
  const devices = useSyncExternalStore(source.subscribe, source.devices);
  const self = devices.find((device) => device.self);

  // The title bar's insets follow maximizing, restoring, and DPI changes.
  useEffect(() => watchTitlebar(), []);

  // Where the title bar takes the system's dark caption color
  // (TitleBar.module.css), that color is lighter while the window is inactive.
  useEffect(() => {
    const root = document.documentElement;
    const mark = (state: "active" | "inactive") => () => (root.dataset.window = state);
    const active = mark("active");
    const inactive = mark("inactive");
    root.dataset.window = document.hasFocus() ? "active" : "inactive";
    window.addEventListener("focus", active);
    window.addEventListener("blur", inactive);
    return () => {
      window.removeEventListener("focus", active);
      window.removeEventListener("blur", inactive);
    };
  }, []);

  const reloadCustom = () => {
    customThemes().then(setCustom, () => setCustom(null));
  };
  useEffect(reloadCustom, []);

  // The custom theme goes on top of the built-in one; then the caption
  // behind the window buttons follows whatever the title bar now shows.
  const customCss = custom?.themes.find((theme) => theme.file === appearance.custom)?.css ?? null;
  useEffect(() => {
    applyCustomCss(document, customCss);
    void syncCaption(document.documentElement, mode);
  }, [customCss, appearance.theme, mode]);

  useEffect(() => source.setIdleLimit(idleLimit), [source, idleLimit]);

  const openSession = (id: string) => {
    setScreen("session");
    setSelected(id);
    if (!detail.pinned) setDetail({ ...detail, open: false, call: undefined });
  };
  const newSession = (kind: SessionKind) => openSession(source.start(kind));
  const changeIdleLimit = (minutes: number) => {
    globalThis.localStorage?.setItem(IDLE_LIMIT_KEY, String(minutes));
    setIdleLimit(minutes);
  };

  const screenTitles: Record<Exclude<Screen, "session">, string> = {
    archive: t.archive.title,
    memory: t.sidebar.memory,
    tools: t.sidebar.tools,
    devices: t.sidebar.devicesScreen,
    usage: t.sidebar.usage,
    settings: t.settings.title,
  };

  let main;
  switch (screen) {
    case "session":
      main = (
        <ConversationScreen
          key={`${locale}-${selected}`}
          source={source}
          id={selected}
          view={view}
          onOpen={(call) => setDetail({ ...detail, open: true, call })}
          onOpenSession={openSession}
        />
      );
      break;
    case "archive":
      main = <ArchiveScreen source={source} onOpenSession={openSession} />;
      break;
    case "settings":
      main = (
        <SettingsScreen
          appearance={appearance}
          mode={mode}
          onAppearance={setAppearance}
          custom={custom}
          onReloadCustom={reloadCustom}
          onOpenCustomFolder={() => void openCustomThemesFolder()}
          idleLimit={idleLimit}
          onIdleLimit={changeIdleLimit}
        />
      );
      break;
    default:
      main = (
        <main className={styles.placeholder} aria-label={screenTitles[screen]}>
          <p>{t.placeholder.body}</p>
        </main>
      );
  }

  return (
    <div className={styles.window}>
      <TitleBar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onNewSession={newSession}
        deviceName={self?.name ?? ""}
      >
        {screen === "session" && conversation ? (
          <Header
            source={source}
            conversation={conversation}
            view={view}
            onViewChange={setView}
            developerDetails={developerDetails}
            onDeveloperDetailsChange={setDeveloperDetails}
            onOpenSession={openSession}
          />
        ) : (
          screen !== "session" && <ScreenTitle>{screenTitles[screen]}</ScreenTitle>
        )}
      </TitleBar>
      <div className={styles.layout} data-sidebar={sidebarOpen ? "open" : "closed"} data-detail={detail.open || undefined}>
        {sidebarOpen && (
          <Sidebar
            source={source}
            selected={selected}
            screen={screen}
            onSelect={openSession}
            onScreen={(next) => setScreen(next)}
          />
        )}
        {main}
        {detail.open && screen === "session" && (
          <DetailPanel
            call={detail.call}
            pinned={detail.pinned}
            developerDetails={developerDetails}
            onPin={(pinned) => setDetail({ ...detail, pinned })}
            onClose={() => setDetail({ open: false, pinned: false })}
          />
        )}
      </div>
    </div>
  );
}
