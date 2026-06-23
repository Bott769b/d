"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import type { ConversationSummary } from "@/lib/types";
import { BrandMark } from "@/components/ui/BrandMark";
import { ease, spring } from "@/components/motion/easings";

export interface SidebarProps {
  conversations: ConversationSummary[];
  activeId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  /** Mobile: whether the drawer is open. */
  open: boolean;
  onClose: () => void;
}

export function Sidebar({
  conversations,
  activeId,
  loading,
  onSelect,
  onNew,
  onRename,
  onDelete,
  open,
  onClose,
}: SidebarProps): React.JSX.Element {
  const groups = React.useMemo(() => groupByRecency(conversations), [conversations]);

  const body = (
    <div className="flex h-full flex-col">
      {/* Brand + new */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[var(--color-ember)]">
            <BrandMark size={18} />
          </span>
          <span className="font-display text-[18px] leading-none tracking-[-0.01em] text-[var(--color-ink)]">
            Cavoti
          </span>
        </div>
        <NewButton onClick={onNew} />
      </div>

      {/* List */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {loading && conversations.length === 0 ? (
          <SkeletonRows />
        ) : conversations.length === 0 ? (
          <p className="px-3 py-6 text-[12.5px] leading-relaxed text-[var(--color-meta)]">
            No saved threads yet. Your conversations will gather here as you write.
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.label} className="mb-2">
              <p className="px-3 pb-1 pt-3 text-[10.5px] uppercase tracking-[0.2em] text-[var(--color-meta)]">
                {group.label}
              </p>
              <ul>
                <AnimatePresence initial={false}>
                  {group.items.map((c) => (
                    <motion.li
                      key={c.id}
                      layout
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
                      transition={{ duration: 0.22, ease: ease.outQuint }}
                    >
                      <SidebarRow
                        conversation={c}
                        active={c.id === activeId}
                        onSelect={() => onSelect(c.id)}
                        onRename={(title) => onRename(c.id, title)}
                        onDelete={() => onDelete(c.id)}
                      />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          ))
        )}
      </nav>

      <div className="border-t border-[var(--color-hairline)] px-4 py-3 text-[11px] text-[var(--color-meta)]">
        <span className="font-mono">{conversations.length}</span> saved{" "}
        {conversations.length === 1 ? "thread" : "threads"}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: static rail */}
      <aside
        className="
          hidden md:flex md:w-[272px] md:shrink-0 md:flex-col
          border-r border-[var(--color-hairline)]
          bg-[color-mix(in_srgb,var(--color-paper-2)_55%,transparent)]
        "
      >
        {body}
      </aside>

      {/* Mobile: drawer */}
      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <button
              type="button"
              aria-label="Close history"
              onClick={onClose}
              className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-ink)_24%,transparent)] backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={spring.pop}
              className="
                absolute inset-y-0 left-0 w-[280px]
                border-r border-[var(--color-hairline-strong)]
                bg-[var(--color-paper-2)]
                shadow-[0_0_60px_-12px_rgba(0,0,0,0.4)]
              "
            >
              {body}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

// ─── row ────────────────────────────────────────────────────────────────────

interface SidebarRowProps {
  conversation: ConversationSummary;
  active: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}

function SidebarRow({
  conversation,
  active,
  onSelect,
  onRename,
  onDelete,
}: SidebarRowProps): React.JSX.Element {
  const [mode, setMode] = React.useState<"idle" | "renaming" | "confirmDelete">("idle");
  const [draft, setDraft] = React.useState(conversation.title);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (mode === "renaming") {
      setDraft(conversation.title);
      const id = window.setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 30);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [mode, conversation.title]);

  const commitRename = () => {
    const next = draft.trim();
    if (next && next !== conversation.title) onRename(next);
    setMode("idle");
  };

  if (mode === "renaming") {
    return (
      <div className="px-1 py-0.5">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitRename();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setMode("idle");
            }
          }}
          className="
            w-full rounded-lg border border-[var(--color-ember)]
            bg-[var(--color-paper)] px-3 py-2 text-[13.5px]
            text-[var(--color-ink)] outline-none
          "
        />
      </div>
    );
  }

  return (
    <div
      className={[
        "group/row relative flex items-center rounded-lg px-1",
        active ? "bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)]" : "",
      ].join(" ")}
    >
      {/* Active rail */}
      <span
        className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r"
        style={{ background: active ? "var(--color-ember)" : "transparent" }}
        aria-hidden="true"
      />

      {mode === "confirmDelete" ? (
        <div className="flex w-full items-center justify-between gap-2 px-2 py-2">
          <span className="text-[12.5px] text-[var(--color-ink)]">Delete this thread?</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onDelete}
              className="rounded-md bg-[var(--color-ember)] px-2 py-1 text-[11px] font-medium text-[#FBF7EE]"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setMode("idle")}
              className="rounded-md px-2 py-1 text-[11px] text-[var(--color-meta)] hover:text-[var(--color-ink)]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={onSelect}
            className="min-w-0 flex-1 py-2 pl-2 pr-1 text-left"
          >
            <span
              className={[
                "block truncate text-[13.5px] leading-tight tracking-tight",
                active ? "text-[var(--color-ink)]" : "text-[var(--color-ink-2)]",
              ].join(" ")}
            >
              {conversation.title}
            </span>
            <span className="mt-0.5 block text-[11px] text-[var(--color-meta)]">
              {relativeTime(conversation.updatedAt)}
            </span>
          </button>

          {/* Hover actions */}
          <div className="flex items-center gap-0.5 pr-1 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
            <IconButton label="Rename" onClick={() => setMode("renaming")}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M9.5 2.5l2 2L5 11l-2.5.5L3 9l6.5-6.5Z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
              </svg>
            </IconButton>
            <IconButton label="Delete" onClick={() => setMode("confirmDelete")}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M3 4h8M5.5 4V3h3v1M5 4l.4 7h3.2L9 4"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </IconButton>
          </div>
        </>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="
        grid h-7 w-7 place-items-center rounded-md text-[var(--color-meta)]
        transition-colors hover:bg-[color-mix(in_srgb,var(--color-ink)_8%,transparent)]
        hover:text-[var(--color-ink)]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ember)]
      "
    >
      {children}
    </button>
  );
}

function NewButton({ onClick }: { onClick: () => void }): React.JSX.Element {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      transition={spring.tactile}
      className="
        inline-flex items-center gap-1.5 rounded-full
        border border-[var(--color-hairline-strong)] bg-transparent
        px-3 h-8 text-[12.5px] tracking-tight text-[var(--color-ink)]
        transition-colors hover:bg-[color-mix(in_srgb,var(--color-ink)_5%,transparent)]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ember)]
      "
    >
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      New
    </motion.button>
  );
}

function SkeletonRows(): React.JSX.Element {
  return (
    <div className="space-y-1 px-1 pt-3">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-[44px] animate-pulse rounded-lg bg-[color-mix(in_srgb,var(--color-ink)_5%,transparent)]"
          style={{ animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────

interface RecencyGroup {
  label: string;
  items: ConversationSummary[];
}

function groupByRecency(conversations: ConversationSummary[]): RecencyGroup[] {
  const now = Date.now();
  const dayMs = 86_400_000;
  const today: ConversationSummary[] = [];
  const week: ConversationSummary[] = [];
  const older: ConversationSummary[] = [];

  for (const c of conversations) {
    const age = now - new Date(c.updatedAt).getTime();
    if (age < dayMs) today.push(c);
    else if (age < dayMs * 7) week.push(c);
    else older.push(c);
  }

  const out: RecencyGroup[] = [];
  if (today.length) out.push({ label: "Today", items: today });
  if (week.length) out.push({ label: "This week", items: week });
  if (older.length) out.push({ label: "Earlier", items: older });
  return out;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
