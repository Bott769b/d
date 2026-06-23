"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { ease } from "@/components/motion/easings";

export interface TooltipProps {
  label: React.ReactNode;
  side?: "top" | "bottom";
  children: React.ReactElement;
}

/** Bare-bones tooltip. Shows on hover/focus, hides on leave/blur/escape. */
export function Tooltip({ label, side = "top", children }: TooltipProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();

  const onShow = () => setOpen(true);
  const onHide = () => setOpen(false);

  const trigger = React.cloneElement(children, {
    onMouseEnter: onShow,
    onMouseLeave: onHide,
    onFocus: onShow,
    onBlur: onHide,
    "aria-describedby": open ? id : undefined,
  } as React.HTMLAttributes<HTMLElement>);

  return (
    <span className="relative inline-flex">
      {trigger}
      <AnimatePresence>
        {open ? (
          <motion.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, y: side === "top" ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: side === "top" ? 4 : -4 }}
            transition={{ duration: 0.18, ease: ease.outQuint }}
            className={[
              "pointer-events-none absolute left-1/2 -translate-x-1/2 z-30",
              "whitespace-nowrap rounded-md px-2 py-1",
              "text-[11px] font-medium tracking-tight",
              "bg-[var(--color-ink)] text-[var(--color-paper)]",
              "shadow-[0_4px_12px_rgba(0,0,0,0.12)]",
              side === "top" ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]",
            ].join(" ")}
          >
            {label}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}
