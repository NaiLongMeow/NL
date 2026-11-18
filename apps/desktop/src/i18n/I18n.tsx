/**
 * The interface language: a React context holding the current locale and its
 * catalog of texts (messages.ts).
 *
 * The locale is the one chosen in Settings, kept in local storage on this
 * device (UI design note, section 13: preferences are local to each device).
 * Until the user chooses, it follows the system language: Chinese for any
 * `zh` variant, English otherwise. The root element's `lang` attribute
 * follows the locale, which makes browsers pick Chinese glyph shapes for Han
 * characters and helps screen readers pronounce the text.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { catalogs, type Locale, type Messages } from "./messages";

interface I18n {
  locale: Locale;
  t: Messages;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18n | null>(null);

/** Where the chosen locale is kept. */
export const LOCALE_KEY = "nl.locale";

/** The locale matching a BCP 47 language tag such as `navigator.language`. */
export function localeFor(language: string | undefined): Locale {
  return language?.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

/** The locale the user chose earlier, if the stored value is one. */
export function storedLocale(storage: Pick<Storage, "getItem"> | undefined = globalThis.localStorage): Locale | undefined {
  const value = storage?.getItem(LOCALE_KEY);
  return value === "en" || value === "zh-CN" ? value : undefined;
}

export function I18nProvider({ initial, children }: { initial?: Locale; children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => initial ?? storedLocale() ?? localeFor(globalThis.navigator?.language));
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const value = useMemo(
    () => ({
      locale,
      t: catalogs[locale],
      setLocale: (next: Locale) => {
        globalThis.localStorage?.setItem(LOCALE_KEY, next);
        setLocale(next);
      },
    }),
    [locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const i18n = useContext(I18nContext);
  if (!i18n) throw new Error("useI18n needs an I18nProvider above it");
  return i18n;
}
