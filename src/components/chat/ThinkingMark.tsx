"use client";

import * as React from "react";

/**
 * Heartbeat dots used while we wait for the first token. Three squares that
 * lift in sequence — a small breathing rhythm rather than the usual spinner.
 */
export function ThinkingMark({ label }: { label?: string }): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-2 text-[var(--color-meta)]">
      <span className="inline-flex items-end gap-[3px]" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block h-[3px] w-[3px] rounded-[1px] bg-[var(--color-meta)]"
            style={{
              animation: `heartbeat 1.4s ease-in-out ${i * 160}ms infinite`,
            }}
          />
        ))}
      </span>
      <span className="text-[12px] tracking-tight">{label ?? "Thinking"}</span>
    </span>
  );
}
