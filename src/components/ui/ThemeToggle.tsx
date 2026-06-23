"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ease } from "@/components/motion/easings";

const STORAGE_KEY = "cavoti.theme";
type Theme = "paper" | "ink";

function readInitial(): Theme {
  if (typeof window === "undefined") return "paper";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "paper" || stored === "ink") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "ink" : "paper";
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "ink") root.classList.add("theme-ink");
  else root.classList.remove("theme-ink");
}

export function ThemeToggle(): React.JSX.Element {
  const [theme, setTheme] = React.useState<Theme>("paper");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const initial = readInitial();
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  const toggle = React.useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "paper" ? "ink" : "paper";
      applyTheme(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* private mode etc. */
      }
      return next;
    });
  }, []);

  return (
    <button
      type="button"
      aria-label={theme === "paper" ? "Switch to ink theme" : "Switch to paper theme"}
      aria-pressed={theme === "ink"}
      onClick={toggle}
      className="
        relative grid h-8 w-8 place-items-center rounded-full
        text-[var(--color-ink)] transition-colors
        hover:bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ember)]
      "
    >
      <AnimatePresence mode="wait" initial={false}>
        {mounted && theme === "paper" ? (
          <motion.svg
            key="sun"
            width={16}
            height={16}
            viewBox="0 0 16 16"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.32, ease: ease.outQuint }}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.4}
            strokeLinecap="round"
          >
            <circle cx="8" cy="8" r="3" />
            <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" />
          </motion.svg>
        ) : null}
        {mounted && theme === "ink" ? (
          <motion.svg
            key="moon"
            width={16}
            height={16}
            viewBox="0 0 16 16"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.32, ease: ease.outQuint }}
            fill="currentColor"
          >
            <path d="M11.6 9.8a4.6 4.6 0 0 1-5.4-5.4 5.2 5.2 0 1 0 5.4 5.4Z" />
          </motion.svg>
        ) : null}
      </AnimatePresence>
    </button>
  );
}
