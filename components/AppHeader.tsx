"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useState } from "react";

type Theme = "light" | "dark";
type ClockDisplay = { time: string; date: string };

const THEME_STORAGE_KEY = "jscc_theme";
const MONTH_LABELS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

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

function formatHeaderClock(date: Date): ClockDisplay {
  const pad = (value: number) => String(value).padStart(2, "0");
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const day = pad(date.getDate());
  const month = MONTH_LABELS[date.getMonth()] ?? "---";
  const year = date.getFullYear();

  return {
    time: `${hours}:${minutes}`,
    date: `${day} ${month} ${year}`,
  };
}

export function AppHeader() {
  const [theme, setTheme] = useState<Theme>("light");
  const [clock, setClock] = useState<ClockDisplay>({ time: "", date: "" });

  useEffect(() => {
    const initialTheme = getInitialTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);

    function tick() {
      setClock(formatHeaderClock(new Date()));
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

  const clockPanelStyle: CSSProperties = theme === "dark"
    ? {
        display: "inline-grid",
        justifyItems: "center",
        minWidth: "128px",
        padding: "7px 12px 6px",
        borderRadius: "10px",
        border: "2px solid #8f6426",
        background: "linear-gradient(180deg, #2a2620 0%, #101010 42%, #050505 100%)",
        boxShadow: "inset 0 2px 5px rgba(255, 210, 120, 0.08), inset 0 -3px 7px rgba(0, 0, 0, 0.75), 0 0 14px rgba(255, 135, 0, 0.18)",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }
    : {
        display: "inline-grid",
        justifyItems: "center",
        minWidth: "108px",
        color: "#5f6675",
        fontVariantNumeric: "tabular-nums",
        fontWeight: 700,
        whiteSpace: "nowrap",
      };

  const clockTimeStyle: CSSProperties = theme === "dark"
    ? {
        color: "#ff8a00",
        fontFamily: "'Courier New', 'Lucida Console', monospace",
        fontSize: "1.42rem",
        fontWeight: 900,
        letterSpacing: "0.08em",
        textShadow: "0 0 4px rgba(255, 138, 0, 0.82), 0 0 12px rgba(255, 138, 0, 0.3)",
        fontVariantNumeric: "tabular-nums",
      }
    : {
        fontVariantNumeric: "tabular-nums",
      };

  const clockDateStyle: CSSProperties = theme === "dark"
    ? {
        marginTop: "4px",
        color: "#ffc266",
        fontFamily: "'Courier New', 'Lucida Console', monospace",
        fontSize: "0.58rem",
        fontWeight: 800,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        textShadow: "0 0 5px rgba(255, 194, 102, 0.4)",
      }
    : {
        fontSize: "0.72rem",
        color: "#5f6675",
      };

  return (
    <header className="header">
      <div className="header-inner">
        <div className="row">
          <strong>JSCC</strong>
          {clock.time ? (
            <span aria-label="Current local date and time" style={clockPanelStyle}>
              <span style={clockTimeStyle}>{clock.time}</span>
              <span style={clockDateStyle}>{clock.date}</span>
            </span>
          ) : null}
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
