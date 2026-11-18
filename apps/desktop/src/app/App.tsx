/**
 * The main window (UI design note, section 5): the sidebar, the open
 * conversation, and the detail panel, which opens when a tool call is
 * opened and can be pinned.
 *
 * Stage 1 runs on the scripted fake source. In development builds a review
 * strip at the top switches language, theme, and conversation, so every
 * state can be looked at; it is not part of the product.
 */

import { useEffect, useMemo, useState } from "react";
import { Tooltip } from "radix-ui";
import { ConversationScreen } from "../conversation/ConversationScreen";
import { createFakeSource } from "../conversation/fake";
import type { ToolCall, View } from "../conversation/model";
import { DetailPanel } from "../detail/DetailPanel";
import { I18nProvider, useI18n } from "../i18n/I18n";
import { Sidebar } from "../sidebar/Sidebar";
import { ReviewStrip, type Theme } from "./ReviewStrip";
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

function MainWindow() {
  const { locale } = useI18n();
  const source = useMemo(() => createFakeSource(locale), [locale]);
  const [selected, setSelected] = useState("hike");
  // Full view is the desktop default (note, section 4.1).
  const [view, setView] = useState<View>("full");
  const [developerDetails, setDeveloperDetails] = useState(false);
  const [detail, setDetail] = useState<{ open: boolean; pinned: boolean; call?: ToolCall }>({ open: false, pinned: false });
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    if (theme === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);

  const select = (id: string) => {
    setSelected(id);
    if (!detail.pinned) setDetail({ ...detail, open: false, call: undefined });
  };

  return (
    <div className={styles.window}>
      {import.meta.env.DEV && (
        <ReviewStrip theme={theme} onTheme={setTheme} selected={selected} onSelect={select} />
      )}
      <div className={styles.layout} data-detail={detail.open || undefined}>
        <Sidebar source={source} selected={selected} onSelect={select} />
        <ConversationScreen
          key={`${locale}-${selected}`}
          source={source}
          id={selected}
          view={view}
          onViewChange={setView}
          developerDetails={developerDetails}
          onDeveloperDetailsChange={setDeveloperDetails}
          onOpen={(call) => setDetail({ ...detail, open: true, call })}
        />
        {detail.open && (
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
