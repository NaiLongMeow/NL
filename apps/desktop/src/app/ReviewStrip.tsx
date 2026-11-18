/**
 * A strip for reviewing the screens in development builds only: switches the
 * interface language, the theme, and the conversation. The real language
 * and theme settings belong to the Settings screen.
 */

import { ToggleGroup } from "radix-ui";
import { useI18n } from "../i18n/I18n";
import type { Locale } from "../i18n/messages";
import styles from "./ReviewStrip.module.css";

export type Theme = "system" | "light" | "dark";

interface Props {
  theme: Theme;
  onTheme: (theme: Theme) => void;
  selected: string;
  onSelect: (id: string) => void;
}

export function ReviewStrip({ theme, onTheme, selected, onSelect }: Props) {
  const { t, locale, setLocale } = useI18n();
  return (
    <div className={styles.strip} role="toolbar" aria-label={t.dev.toolbar}>
      <span className={styles.badge}>{t.dev.toolbar}</span>
      <Choice<Locale>
        label={t.dev.language}
        value={locale}
        onChange={setLocale}
        options={[
          ["en", "English"],
          ["zh-CN", "中文"],
        ]}
      />
      <Choice<Theme>
        label={t.dev.theme}
        value={theme}
        onChange={onTheme}
        options={[
          ["system", t.dev.system],
          ["light", t.dev.light],
          ["dark", t.dev.dark],
        ]}
      />
      <Choice<string>
        label={t.dev.scenario}
        value={selected === "chat" ? "chat" : "hike"}
        onChange={onSelect}
        options={[
          ["hike", "Tools · 工具"],
          ["chat", "Chat · 聊天"],
        ]}
      />
    </div>
  );
}

function Choice<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<[T, string]>;
}) {
  return (
    <span className={styles.choice}>
      <span className={styles.label}>{label}</span>
      <ToggleGroup.Root
        type="single"
        className={styles.group}
        value={value}
        aria-label={label}
        onValueChange={(next) => next && onChange(next as T)}
      >
        {options.map(([option, text]) => (
          <ToggleGroup.Item key={option} value={option} className={styles.option}>
            {text}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    </span>
  );
}
