"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  groupByProvider,
  TIER_COLOR,
  TIER_LABEL,
  type ModelInfo,
} from "@/lib/models";
import { ease, spring } from "@/components/motion/easings";

export interface ModelPickerProps {
  open: boolean;
  models: ModelInfo[];
  currentId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function ModelPicker({
  open,
  models,
  currentId,
  onSelect,
  onClose,
}: ModelPickerProps): React.JSX.Element {
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const flatRef = React.useRef<ModelInfo[]>([]);
  const [activeIdx, setActiveIdx] = React.useState(0);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models;
    return models.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.label.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q) ||
        m.blurb.toLowerCase().includes(q),
    );
  }, [models, query]);

  const groups = React.useMemo(() => groupByProvider(filtered), [filtered]);

  React.useEffect(() => {
    flatRef.current = groups.flatMap((g) => g.models);
  }, [groups]);

  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIdx(Math.max(0, models.findIndex((m) => m.id === currentId)));
    const id = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(id);
  }, [open, models, currentId]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, flatRef.current.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        const target = flatRef.current[activeIdx];
        if (target) {
          e.preventDefault();
          onSelect(target.id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, onSelect, activeIdx]);

  let runningIdx = -1;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: ease.outQuint }}
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close model picker"
            onClick={onClose}
            className="
              absolute inset-0 cursor-default
              bg-[color-mix(in_srgb,var(--color-ink)_22%,transparent)]
              backdrop-blur-[2px]
            "
          />

          {/* Sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Choose a model"
            initial={{ y: 24, opacity: 0, scale: 0.985 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.985 }}
            transition={spring.pop}
            className="
              absolute left-1/2 top-1/2 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2
              overflow-hidden rounded-2xl
              border border-[var(--color-hairline-strong)]
              bg-[var(--color-paper-2)]
              shadow-[0_24px_60px_-24px_rgba(0,0,0,0.4)]
            "
          >
            <div className="flex items-center gap-3 border-b border-[var(--color-hairline)] px-4 py-3">
              <SearchIcon />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by name, id, provider…"
                className="
                  w-full bg-transparent text-[14px] tracking-tight
                  text-[var(--color-ink)] placeholder:text-[var(--color-meta)]
                  outline-none
                "
              />
              <kbd
                className="
                  hidden rounded border border-[var(--color-hairline)]
                  px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-meta)] sm:inline
                "
              >
                Esc
              </kbd>
            </div>

            <div className="max-h-[60vh] overflow-y-auto py-2">
              {groups.length === 0 ? (
                <p className="px-4 py-8 text-center text-[13px] text-[var(--color-meta)]">
                  Nothing matches. Try a different word.
                </p>
              ) : (
                groups.map((group) => (
                  <section key={group.provider} className="px-2 pt-2 pb-1">
                    <p
                      className="
                        px-3 pb-1 text-[10.5px] uppercase tracking-[0.2em]
                        text-[var(--color-meta)]
                      "
                    >
                      {group.provider}
                    </p>
                    <ul role="listbox" aria-label={group.provider}>
                      {group.models.map((m) => {
                        runningIdx += 1;
                        const isActive = runningIdx === activeIdx;
                        const isCurrent = m.id === currentId;
                        return (
                          <li key={m.id}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={isCurrent}
                              onMouseEnter={() => setActiveIdx(runningIdx)}
                              onClick={() => onSelect(m.id)}
                              className={[
                                "group/item relative w-full rounded-xl px-3 py-2.5 text-left",
                                "transition-colors",
                                isActive
                                  ? "bg-[color-mix(in_srgb,var(--color-ink)_5%,transparent)]"
                                  : "",
                              ].join(" ")}
                            >
                              {/* Left rail accent — only shown for the active row. */}
                              <span
                                className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r"
                                style={{
                                  background: isActive ? "var(--color-ember)" : "transparent",
                                  transition: "background 200ms",
                                }}
                                aria-hidden="true"
                              />
                              <div className="flex items-baseline gap-3">
                                <span className="flex items-center gap-2">
                                  <span
                                    className="inline-block h-[6px] w-[6px] rounded-full"
                                    style={{ background: TIER_COLOR[m.tier] }}
                                    aria-hidden="true"
                                  />
                                  <span className="text-[14px] font-medium tracking-tight text-[var(--color-ink)]">
                                    {m.label}
                                  </span>
                                </span>
                                <span className="ml-auto text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-meta)]">
                                  {TIER_LABEL[m.tier]}
                                </span>
                              </div>
                              <div className="mt-0.5 flex items-center gap-2">
                                <span className="font-mono text-[11.5px] text-[var(--color-meta)]">
                                  {m.id}
                                </span>
                                {isCurrent ? (
                                  <span className="text-[11px] text-[var(--color-ember)]">in use</span>
                                ) : null}
                              </div>
                              <p className="mt-1 text-[12.5px] leading-snug text-[var(--color-meta)]">
                                {m.blurb}
                              </p>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))
              )}
            </div>

            <div
              className="
                flex items-center justify-between border-t border-[var(--color-hairline)]
                px-4 py-2.5 text-[11px] text-[var(--color-meta)]
              "
            >
              <span>
                <kbd className="font-mono">↑</kbd>
                <kbd className="ml-1 font-mono">↓</kbd> to navigate
              </span>
              <span>
                <kbd className="font-mono">Enter</kbd> to select
              </span>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function SearchIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M9 9l3 3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
