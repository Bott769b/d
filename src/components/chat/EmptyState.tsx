"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ease } from "@/components/motion/easings";

const PROMPTS: ReadonlyArray<string> = [
  "The cursor is yours.",
  "What's on the page tonight?",
  "Begin anywhere.",
  "A scene, a sentence, a plan.",
  "Say it once. Mean it twice.",
];

const SEEDS: ReadonlyArray<{ label: string; prompt: string }> = [
  {
    label: "Cold open",
    prompt: "Write the cold open of a spy thriller. Six lines, no dialogue, end on a verb.",
  },
  {
    label: "Refactor pass",
    prompt: "Review this function and propose three concrete refactors with tradeoffs.",
  },
  {
    label: "Reverse brief",
    prompt: "Here is a finished paragraph. Reverse-engineer the brief that produced it.",
  },
  {
    label: "Steel-man",
    prompt: "Steel-man the opposing argument to my last claim, in two paragraphs.",
  },
];

export interface EmptyStateProps {
  onPick: (prompt: string) => void;
  modelLabel: string;
}

export function EmptyState({ onPick, modelLabel }: EmptyStateProps): React.JSX.Element {
  const [idx, setIdx] = React.useState(0);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % PROMPTS.length);
    }, 4800);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col px-5 pt-16 pb-12">
      <p className="block-enter text-[12px] uppercase tracking-[0.18em] text-[var(--color-meta)]">
        Connected · <span className="font-mono normal-case tracking-normal">{modelLabel}</span>
      </p>

      <h1 className="mt-3 min-h-[1.2em] text-[44px] sm:text-[56px] leading-[1.05] tracking-[-0.02em]">
        <AnimatePresence mode="wait">
          <motion.span
            key={idx}
            initial={{ opacity: 0, y: 8, filter: "blur(2px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
            transition={{ duration: 0.5, ease: ease.outQuint }}
            className="font-display block"
          >
            {PROMPTS[idx]}
          </motion.span>
        </AnimatePresence>
      </h1>

      <p
        className="block-enter mt-6 max-w-[52ch] text-[14.5px] leading-[1.7] text-[var(--color-meta)]"
        style={{ ["--delay" as string]: "120ms" }}
      >
        Write to it like you'd write to a careful friend. The model will keep the room and the
        weather. You bring the body in motion.
      </p>

      <div className="mt-10 grid gap-2 sm:grid-cols-2">
        {SEEDS.map((seed, i) => (
          <motion.button
            key={seed.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: ease.outQuint, delay: 0.2 + i * 0.05 }}
            whileHover={{ y: -1 }}
            onClick={() => onPick(seed.prompt)}
            className="
              group/seed text-left rounded-2xl border border-[var(--color-hairline)]
              bg-[color-mix(in_srgb,var(--color-paper-2)_70%,transparent)]
              px-4 py-3.5 transition-colors
              hover:border-[var(--color-hairline-strong)]
              hover:bg-[color-mix(in_srgb,var(--color-paper-2)_92%,transparent)]
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ember)]
            "
          >
            <p className="text-[12.5px] uppercase tracking-[0.14em] text-[var(--color-meta)]">
              {seed.label}
            </p>
            <p className="mt-1 text-[14px] leading-[1.5] text-[var(--color-ink)]">{seed.prompt}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
