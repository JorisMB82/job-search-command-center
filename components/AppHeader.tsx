"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "jscc_theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
}

export function AppHeader() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const initialTheme = getInitialTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }

  return (
    <header className="header">
      <div className="header-inner">
        <strong>Job Search Command Center</strong>
        <nav className="nav" aria-label="Primary navigation">
          <Link href="/">Dashboard</Link>
          <Link href="/resumes">Resume templates</Link>
          <Link href="/help">Help</Link>
          <button className="secondary theme-toggle" type="button" onClick={toggleTheme} aria-label="Toggle light and dark mode">
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <form action="/api/logout" method="post">
            <button className="secondary" type="submit">Log out</button>
          </form>
        </nav>
      </div>
    </header>
  );
}
