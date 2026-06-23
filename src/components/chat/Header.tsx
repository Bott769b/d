"use client";

import * as React from "react";
import { BrandMark } from "@/components/ui/BrandMark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Tooltip } from "@/components/ui/Tooltip";

export interface HeaderProps {
  modelLabel: string;
  onOpenModelPicker: () => void;
  onNewThread: () => void;
  onToggleSidebar: () => void;
  hasMessages: boolean;
  /** Title of the active conversation, shown on desktop. */
  activeTitle?: string;
}

export function Header({
  modelLabel,
  onOpenModelPicker,
  onNewThread,
  onToggleSidebar,
  hasMessages,
  activeTitle,
}: HeaderProps): React.JSX.Element {
  return (
    <header
      className="
        sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between
        border-b border-[var(--color-hairline)]
        bg-[color-mix(in_srgb,var(--color-paper)_82%,transparent)]
        px-4 backdrop-blur-md sm:px-5
      "
    >
      {/* Left: mobile menu + brand (mobile) / active title (desktop) */}
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Open history"
          className="
            grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--color-ink)]
            transition-colors hover:bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)]
            focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ember)]
            md:hidden
          "
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M2 4h12M2 8h12M2 12h12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* Brand on mobile (sidebar carries it on desktop) */}
        <div className="flex items-center gap-2 md:hidden">
          <span className="text-[var(--color-ember)]">
            <BrandMark size={18} />
          </span>
          <span className="font-display text-[18px] leading-none tracking-[-0.01em] text-[var(--color-ink)]">
            Cavoti
          </span>
        </div>

        {/* Active thread title on desktop */}
        <span className="hidden min-w-0 truncate text-[13px] tracking-tight text-[var(--color-meta)] md:block">
          {activeTitle ?? "New thread"}
        </span>
      </div>

      {/* Right: model + new + theme */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenModelPicker}
          className="
            group/model inline-flex items-center gap-2 rounded-full
            border border-[var(--color-hairline)]
            bg-[color-mix(in_srgb,var(--color-paper-2)_70%,transparent)]
            px-3 h-8 text-[12.5px] tracking-tight text-[var(--color-ink)]
            transition-colors hover:border-[var(--color-hairline-strong)]
            focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ember)]
          "
        >
          <span className="block h-[6px] w-[6px] rounded-full bg-[var(--color-ember)]" aria-hidden="true" />
          <span className="font-mono text-[12px]">{modelLabel}</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path
              d="M2 4l3 3 3-3"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {hasMessages ? (
          <Tooltip label="Start a new thread" side="bottom">
            <button
              type="button"
              onClick={onNewThread}
              className="
                grid h-8 w-8 place-items-center rounded-full
                text-[var(--color-ink)] transition-colors
                hover:bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)]
                focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ember)]
              "
              aria-label="Start a new thread"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M7 2v10M2 7h10"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </Tooltip>
        ) : null}

        <Tooltip label="Sign out" side="bottom">
          <button
            type="button"
            onClick={() => {
              void fetch("/api/auth/logout", { method: "POST" }).finally(() => {
                window.location.assign("/login");
              });
            }}
            className="
              grid h-8 w-8 place-items-center rounded-full
              text-[var(--color-ink)] transition-colors
              hover:bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)]
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ember)]
            "
            aria-label="Sign out"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M6 2H3.5A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14H6M10.5 11l3-3-3-3M13 8H6"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </Tooltip>

        <ThemeToggle />
      </div>
    </header>
  );
}
