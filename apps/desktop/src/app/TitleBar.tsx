/**
 * The main window's title bar (UI design note, section 5).
 *
 * On Windows the page draws the bar while the system keeps drawing the
 * minimize, maximize, and close buttons in the top-right corner
 * (src-tauri/src/titlebar.rs), so Snap Layouts, the system menu,
 * double-click to maximize, and dragging stay native. The bar is an
 * `app-region: drag` area: pressing on its empty parts moves the window,
 * and every control in it is marked not draggable (TitleBar.module.css).
 *
 * Over the sidebar the bar holds the sidebar toggle and New session; over
 * the session it holds the session's header (passed as children), or the
 * title of the screen that is open.
 */

import type { ReactNode } from "react";
import { ChevronDown, Laptop, PanelLeft, SquarePen, Users } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import type { SessionKind } from "../conversation/model";
import { useI18n } from "../i18n/I18n";
import { IconButton } from "../ui/Button";
import styles from "./TitleBar.module.css";

interface Props {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onNewSession: (kind: SessionKind) => void;
  /** This device's name, for the device-session choice. */
  deviceName: string;
  children: ReactNode;
}

export function TitleBar({ sidebarOpen, onToggleSidebar, onNewSession, deviceName, children }: Props) {
  const { t } = useI18n();
  return (
    <header className={styles.titlebar}>
      <div className={styles.side} data-open={sidebarOpen || undefined}>
        <IconButton
          label={sidebarOpen ? t.titlebar.hideSidebar : t.titlebar.showSidebar}
          size="sm"
          aria-expanded={sidebarOpen}
          onClick={onToggleSidebar}
        >
          <PanelLeft />
        </IconButton>
        {sidebarOpen && <span className={styles.brand}>{t.app.name}</span>}
        <div className={styles.newSession}>
          <button type="button" className={styles.newMain} onClick={() => onNewSession("shared")}>
            <SquarePen aria-hidden />
            <span className={styles.newLabel}>{t.titlebar.newSession}</span>
          </button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button type="button" className={styles.newMore} aria-label={`${t.titlebar.newSession}…`}>
                <ChevronDown aria-hidden />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className={styles.menu} align="start" sideOffset={6}>
                <DropdownMenu.Item className={styles.item} onSelect={() => onNewSession("shared")}>
                  <Users aria-hidden />
                  <span className={styles.itemText}>
                    {t.titlebar.newShared}
                    <small>{t.titlebar.newSharedHint}</small>
                  </span>
                </DropdownMenu.Item>
                <DropdownMenu.Item className={styles.item} onSelect={() => onNewSession("device")}>
                  <Laptop aria-hidden />
                  <span className={styles.itemText}>
                    {t.titlebar.newDevice(deviceName)}
                    <small>{t.titlebar.newDeviceHint}</small>
                  </span>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
      <div className={styles.main}>{children}</div>
    </header>
  );
}

/** The title bar's content for a screen other than a session. */
export function ScreenTitle({ children }: { children: ReactNode }) {
  return <h1 className={styles.screenTitle}>{children}</h1>;
}
