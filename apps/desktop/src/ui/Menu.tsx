/**
 * Menus of actions (UI design note, sections 4.15 and 12). The actions are
 * data, so that one list serves a session's context menu in the sidebar and
 * the header's dropdown menu alike. Both are Radix menus: arrow keys, Enter,
 * Esc, and typeahead work, and screen readers hear a menu.
 *
 * A context menu opens on a right click, on the menu key or Shift+F10 while
 * something inside it has the focus, and on a long press on a touch screen.
 * It takes the place of the browser's menu there (section 5).
 */

import { ContextMenu as RadixContextMenu, DropdownMenu } from "radix-ui";
import { useRef, type MouseEvent, type ReactNode } from "react";
import styles from "./Menu.module.css";

export type MenuEntry =
  | {
      kind: "item";
      label: string;
      icon: ReactNode;
      onSelect: () => void;
      disabled?: boolean;
    }
  | { kind: "separator" };

export const separator: MenuEntry = { kind: "separator" };

export function menuItem(label: string, icon: ReactNode, onSelect: () => void, disabled = false): MenuEntry {
  return { kind: "item", label, icon, onSelect, disabled };
}

/**
 * Gives `children` a context menu with `entries`; with no entries they get
 * none, and the browser's own rules apply. `onOpen` runs on the right click
 * itself, before the menu opens, while the selection is still the one the
 * user made.
 *
 * The chosen action runs once the menu has closed, as a native menu's
 * does: the focus first goes back to what had it before the menu opened,
 * and then the action may move it, such as into the composer after Quote.
 * While the menu is open it holds the focus, so an action that ran then
 * could not move it; and Radix would hand it to the trigger, which here is
 * a wrapper that cannot take it.
 */
export function ContextMenu({
  entries,
  onOpen,
  children,
}: {
  entries: readonly MenuEntry[];
  onOpen?: (event: MouseEvent<HTMLElement>) => void;
  children: ReactNode;
}) {
  const focused = useRef<Element | null>(null);
  const chosen = useRef<(() => void) | null>(null);
  if (entries.length === 0) return <>{children}</>;
  return (
    <RadixContextMenu.Root>
      <RadixContextMenu.Trigger asChild>
        {/* `display: contents`: the wrapper takes the events without changing the layout. */}
        <div
          className={styles.trigger}
          onContextMenu={(event) => {
            focused.current = document.activeElement;
            onOpen?.(event);
          }}
        >
          {children}
        </div>
      </RadixContextMenu.Trigger>
      <RadixContextMenu.Portal>
        <RadixContextMenu.Content
          className={styles.menu}
          collisionPadding={8}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const before = focused.current;
            if (before instanceof HTMLElement && before.isConnected) before.focus();
            const action = chosen.current;
            chosen.current = null;
            action?.();
          }}
        >
          {entries.map((entry, index) =>
            entry.kind === "separator" ? (
              <RadixContextMenu.Separator key={`separator-${index}`} className={styles.separator} />
            ) : (
              <RadixContextMenu.Item
                key={entry.label}
                className={styles.item}
                disabled={entry.disabled}
                onSelect={() => (chosen.current = entry.onSelect)}
              >
                {entry.icon}
                <span>{entry.label}</span>
              </RadixContextMenu.Item>
            ),
          )}
        </RadixContextMenu.Content>
      </RadixContextMenu.Portal>
    </RadixContextMenu.Root>
  );
}

/** The same entries as items of a dropdown menu, inside its content, such as the header's. */
export function DropdownEntries({ entries }: { entries: readonly MenuEntry[] }) {
  return (
    <>
      {entries.map((entry, index) =>
        entry.kind === "separator" ? (
          <DropdownMenu.Separator key={`separator-${index}`} className={styles.separator} />
        ) : (
          <DropdownMenu.Item key={entry.label} className={styles.item} disabled={entry.disabled} onSelect={entry.onSelect}>
            {entry.icon}
            <span>{entry.label}</span>
          </DropdownMenu.Item>
        ),
      )}
    </>
  );
}

/** Class names for a dropdown menu's own content and items, so that every menu looks the same. */
export const menuStyles = { menu: styles.menu, item: styles.item, separator: styles.separator, check: styles.check };
