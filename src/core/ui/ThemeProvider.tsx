"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Accent = "challenger" | "volt" | "ember" | "aurora";

interface ThemeContextType {
  accent: Accent;
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
  initialAccent?: Accent;
}

export function ThemeProvider({
  children,
  initialAccent = "challenger",
}: ThemeProviderProps) {
  const [accent, setAccentState] = useState<Accent>(initialAccent);

  // Initialize from localStorage on client mount
  useEffect(() => {
    const savedAccent = (localStorage.getItem("accent") || initialAccent) as Accent;

    setAccentState(savedAccent);
    document.documentElement.setAttribute("data-accent", savedAccent);
  }, [initialAccent]);

  const setAccent = (newAccent: Accent) => {
    setAccentState(newAccent);
    localStorage.setItem("accent", newAccent);
    document.documentElement.setAttribute("data-accent", newAccent);
  };

  return (
    <ThemeContext.Provider
      value={{
        accent,
        setAccent,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
