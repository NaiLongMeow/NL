/**
 * The interface language: a React context holding the current locale and its
 * catalog of texts (messages.ts).
 *
 * The locale follows the system language at first (Chinese for any `zh`
 * variant, English otherwise). The Settings screen will let the user choose
 * it; until then the review toolbar switches it. The root element's `lang`
 * attribute follows the locale, which makes browsers pick Chinese glyph
 * shapes for Han characters and helps screen readers pronounce the text.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { catalogs, type Locale, type Messages } from "./messages";

interface I18n {
  locale: Locale;
  t: Messages;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18n | null>(null);

/** The locale matching a BCP 47 language tag such as `navigator.language`. */
export function localeFor(language: string | undefined): Locale {
  return language?.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

export function I18nProvider({ initial, children }: { initial?: Locale; children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(initial ?? localeFor(globalThis.navigator?.language));
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const value = useMemo(() => ({ locale, t: catalogs[locale], setLocale }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const i18n = useContext(I18nContext);
  if (!i18n) throw new Error("useI18n needs an I18nProvider above it");
  return i18n;
}
