"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useState } from "react";

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

function formatHeaderDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const year = String(date.getFullYear()).slice(-2);
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${month}.${day}.${year} // ${hours}:${minutes}:${seconds}`;
}

export function AppHeader() {
  const [theme, setTheme] = useState<Theme>("light");
  const [clockText, setClockText] = useState("");

  useEffect(() => {
    const initialTheme = getInitialTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);

    function tick() {
      setClockText(formatHeaderDateTime(new Date()));
    }

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }

  const clockStyle: CSSProperties = theme === "dark"
    ? {
        color: "#ff4f8b",
        border: "1px solid #ff4f8b",
        borderRadius: "4px",
        padding: "4px 8px",
        fontVariantNumeric: "tabular-nums",
        fontWeight: 800,
        letterSpacing: "0.08em",
        textShadow: "0 0 10px rgba(255, 79, 139, 0.72)",
        boxShadow: "0 0 12px rgba(255, 79, 139, 0.26)",
        whiteSpace: "nowrap",
      }
    : {
        color: "#5f6675",
        fontVariantNumeric: "tabular-nums",
        fontWeight: 700,
        whiteSpace: "nowrap",
      };

  return (
    <header className="header">
      <div className="header-inner">
        <div className="row">
          <strong>JSCC</strong>
          {clockText ? <span aria-label="Current local date and time" style={clockStyle}>{clockText}</span> : null}
        </div>
        <nav className="nav" aria-label="Primary navigation">
          <Link href="/">Dashboard</Link>
          <Link href="/radar">Opportunity Radar</Link>
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
