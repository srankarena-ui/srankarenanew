"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "dark" | "light";
export type Accent = "challenger" | "volt" | "ember" | "aurora";

interface ThemeContextType {
  theme: Theme;
  accent: Accent;
  setTheme: (theme: Theme) => void;
  setAccent: (accent: Accent) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: Theme;
  initialAccent?: Accent;
}

export function ThemeProvider({
  children,
  initialTheme = "dark",
  initialAccent = "challenger",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [accent, setAccentState] = useState<Accent>(initialAccent);
  const [mounted, setMounted] = useState(false);

  // Initialize from localStorage on client mount
  useEffect(() => {
    const savedTheme = (localStorage.getItem("theme") || initialTheme) as Theme;
    const savedAccent = (localStorage.getItem("accent") || initialAccent) as Accent;

    setThemeState(savedTheme);
    setAccentState(savedAccent);
    document.documentElement.setAttribute("data-theme", savedTheme);
    document.documentElement.setAttribute("data-accent", savedAccent);
    setMounted(true);
  }, [initialTheme, initialAccent]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const setAccent = (newAccent: Accent) => {
    setAccentState(newAccent);
    localStorage.setItem("accent", newAccent);
    document.documentElement.setAttribute("data-accent", newAccent);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        accent,
        setTheme,
        setAccent,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
