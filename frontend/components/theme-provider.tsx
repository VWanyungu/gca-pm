"use client";

import { createContext, useCallback, useContext } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

const ThemeContext = createContext<{ toggle: () => void }>({ toggle: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * `<html data-theme>` is the single source of truth — globals.css keys the dark palette off
 * it, THEME_INIT_SCRIPT sets it before first paint, and this only flips it. Deliberately no
 * React state: the server cannot know the stored theme, so holding it in state would render
 * one thing on the server and another on the client. The navbar renders both icons and lets
 * CSS pick, which keeps the markup identical either way.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const toggle = useCallback(() => {
    const next: Theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing can refuse storage; the theme still applies for this session.
    }
  }, []);

  return <ThemeContext.Provider value={{ toggle }}>{children}</ThemeContext.Provider>;
}

/** Runs before first paint, so a dark-mode user never sees a white flash. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})();`;
