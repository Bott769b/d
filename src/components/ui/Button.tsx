"use client";

import * as React from "react";
import { motion } from "motion/react";
import { spring } from "@/components/motion/easings";

type ButtonVariant = "primary" | "ghost" | "subtle";
type ButtonSize = "sm" | "md";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-ember)] text-[#FBF7EE] hover:bg-[color-mix(in_srgb,var(--color-ember)_88%,#000_12%)]",
  ghost:
    "bg-transparent text-[var(--color-ink)] hover:bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)]",
  subtle:
    "bg-[color-mix(in_srgb,var(--color-ink)_5%,transparent)] text-[var(--color-ink)] hover:bg-[color-mix(in_srgb,var(--color-ink)_9%,transparent)]",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-[14px]",
};

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "ref"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "subtle", size = "md", className, children, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.965 }}
      transition={spring.tactile}
      className={[
        "inline-flex items-center gap-2 rounded-full font-medium tracking-tight",
        "transition-colors duration-200 ease-out",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ember)]",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        VARIANT[variant],
        SIZE[size],
        className ?? "",
      ].join(" ")}
      {...(rest as React.ComponentProps<typeof motion.button>)}
    >
      {children}
    </motion.button>
  );
});
