"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { ease } from "@/components/motion/easings";

export interface UploaderProps {
  busy: boolean;
  progress: number; // 0..100
  onFiles: (files: File[]) => void;
}

export function Uploader({ busy, progress, onFiles }: UploaderProps): React.JSX.Element {
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const depth = React.useRef(0);

  const pick = () => inputRef.current?.click();

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    depth.current = 0;
    setDragging(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) onFiles(files);
  };

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        depth.current += 1;
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault();
        depth.current -= 1;
        if (depth.current <= 0) setDragging(false);
      }}
      onDrop={onDrop}
      className="relative"
    >
      <motion.button
        type="button"
        onClick={pick}
        disabled={busy}
        animate={{
          borderColor: dragging
            ? "var(--color-ember)"
            : "var(--color-hairline-strong)",
          backgroundColor: dragging
            ? "color-mix(in srgb, var(--color-ember) 7%, transparent)"
            : "color-mix(in srgb, var(--color-paper-2) 45%, transparent)",
        }}
        transition={{ duration: 0.2 }}
        className="
          flex w-full flex-col items-center justify-center gap-4 rounded-3xl border border-dashed
          px-6 py-16 text-center transition-colors
          focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ember)]
          disabled:cursor-not-allowed
        "
      >
        <motion.span
          animate={{ y: dragging ? -6 : 0, scale: dragging ? 1.08 : 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className="grid h-14 w-14 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--color-ember)_12%,transparent)] text-[var(--color-ember)]"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 16V4M7 9l5-5 5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.span>
        <span>
          <span className="block text-[15.5px] font-medium text-[var(--color-ink)]">
            {dragging ? "Drop to upload" : "Drag files here, or click to browse"}
          </span>
          <span className="mt-1 block text-[13px] text-[var(--color-meta)]">
            Images and documents, up to 25 MB each
          </span>
        </span>
      </motion.button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.doc,.docx,.txt,.md,.zip,.csv,.json"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />

      <AnimatePresence>
        {busy ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.22, ease: ease.outQuint }}
            className="mt-4"
          >
            <div className="mb-1.5 flex items-center justify-between text-[12px] text-[var(--color-meta)]">
              <span>Uploading…</span>
              <span className="font-mono">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-ink)_8%,transparent)]">
              <motion.div
                className="h-full rounded-full bg-[var(--color-ember)]"
                animate={{ width: `${progress}%` }}
                transition={{ ease: ease.outQuint, duration: 0.2 }}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
