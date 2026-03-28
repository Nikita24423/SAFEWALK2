"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, messages, translate } from "@/lib/i18n";

/** @typedef {import("@/lib/i18n").Locale} Locale */

const LocaleContext = createContext(null);

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (stored === "en" || stored === "ru") {
        setLocaleState(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = locale === "en" ? "en" : "ru";
  }, [locale]);

  const setLocale = useCallback((next) => {
    setLocaleState(next === "en" ? "en" : "ru");
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((prev) => (prev === "ru" ? "en" : "ru"));
  }, []);

  const t = useMemo(() => {
    return (/** @type {string} */ key) => translate(locale, key);
  }, [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, toggleLocale, t }),
    [locale, setLocale, toggleLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      toggleLocale: () => {},
      t: (/** @type {string} */ key) => translate(DEFAULT_LOCALE, key),
    };
  }
  return ctx;
}
