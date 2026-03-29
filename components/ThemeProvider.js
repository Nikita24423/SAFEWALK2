"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { THEMES, THEME_STORAGE_KEY, applyThemeToDocument } from "@/lib/theme";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("green");
  const hydrated = useRef(false);

  useLayoutEffect(() => {
    try {
      let next = "green";
      const raw = localStorage.getItem(THEME_STORAGE_KEY);
      if (raw && THEMES.includes(raw)) {
        next = raw;
      }
      setThemeState(next);
      applyThemeToDocument(next);
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      applyThemeToDocument("green");
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    applyThemeToDocument(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const setTheme = useCallback((next) => {
    if (THEMES.includes(next)) {
      setThemeState(next);
    }
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeState((prev) => {
      const i = THEMES.indexOf(prev);
      return THEMES[(i + 1) % THEMES.length];
    });
  }, []);

  const value = useMemo(() => ({ theme, setTheme, cycleTheme }), [theme, setTheme, cycleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: "green",
      setTheme: () => {},
      cycleTheme: () => {},
    };
  }
  return ctx;
}
