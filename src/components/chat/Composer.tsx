"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { ease, spring } from "@/components/motion/easings";

const MAX_HEIGHT = 220;
const MIN_HEIGHT = 56;
const MAX_FILES = 6;

export interface ComposerProps {
  busy: boolean;
  onSend: (text: string, files: File[]) => void;
  onAbort?: () => void;
  modelLabel: string;
  onOpenModelPicker: () => void;
}

export function Composer({
  busy,
  onSend,
  onAbort,
  modelLabel,
  onOpenModelPicker,
}: ComposerProps): React.JSX.Element {
  const [value, setValue] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [pulse, setPulse] = React.useState(0);
  const ref = React.useRef<HTMLTextAreaElement | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  const resize = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, el.scrollHeight));
    el.style.height = `${next}px`;
  }, []);

  React.useLayoutEffect(() => {
    resize();
  }, [resize, value]);

  const addFiles = React.useCallback((incoming: File[]) => {
    setFiles((prev) => {
      const merged = [...prev];
      for (const f of incoming) {
        if (merged.length >= MAX_FILES) break;
        if (!merged.some((m) => m.name === f.name && m.size === f.size)) merged.push(f);
      }
      return merged;
    });
  }, []);

  const submit = React.useCallback(() => {
    const text = value.trim();
    if ((!text && files.length === 0) || busy) return;
    onSend(text, files);
    setValue("");
    setFiles([]);
    setPulse((p) => p + 1);
  }, [busy, files, onSend, value]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const canSend = (value.trim().length > 0 || files.length > 0) && !busy;

  return (
    <div className="mx-auto w-full max-w-[760px] px-5 pb-6">
      <div
        className="
          focus-frame relative overflow-hidden rounded-[18px]
          border border-[var(--color-hairline)]
          bg-[color-mix(in_srgb,var(--color-paper-2)_96%,transparent)]
          shadow-[0_1px_0_var(--color-hairline),0_18px_44px_-32px_rgba(0,0,0,0.25)]
          backdrop-blur-md
        "
      >
        {/* Attachment chips */}
        <AnimatePresence initial={false}>
          {files.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: ease.outQuint }}
              className="flex flex-wrap gap-2 px-4 pt-4"
            >
              {files.map((f, i) => (
                <motion.span
                  key={`${f.name}-${f.size}`}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="inline-flex max-w-[220px] items-center gap-2 rounded-full border border-[var(--color-hairline-strong)] bg-[var(--color-paper)] py-1 pl-2.5 pr-1.5 text-[12px]"
                >
                  <span aria-hidden className="text-[var(--color-ember)]">
                    {f.type.startsWith("image/") ? <ImageGlyph /> : <PaperclipGlyph />}
                  </span>
                  <span className="truncate text-[var(--color-ink-2)]">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    aria-label={`Remove ${f.name}`}
                    className="grid h-5 w-5 place-items-center rounded-full text-[var(--color-meta)] hover:bg-[color-mix(in_srgb,var(--color-ink)_8%,transparent)] hover:text-[var(--color-ink)]"
                  >
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                      <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </button>
                </motion.span>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Begin anywhere."
          disabled={busy}
          className="
            block w-full resize-none bg-transparent
            px-5 pt-5 pb-12
            text-[16px] leading-[1.55] tracking-tight
            text-[var(--color-ink)] placeholder:text-[var(--color-meta)]
            outline-none disabled:opacity-70
          "
          style={{ minHeight: MIN_HEIGHT, maxHeight: MAX_HEIGHT }}
        />

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 px-3 pb-3 pt-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              aria-label="Attach files"
              className="
                grid h-8 w-8 place-items-center rounded-full text-[var(--color-meta)]
                transition-colors hover:bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)] hover:text-[var(--color-ink)]
                focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ember)]
                disabled:opacity-50
              "
            >
              <PaperclipGlyph />
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,application/pdf,.doc,.docx,.txt,.md,.csv,.json,.zip"
              className="hidden"
              onChange={(e) => {
                addFiles(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={onOpenModelPicker}
              className="
                draw-underline group/model inline-flex items-center gap-2 rounded-md px-2 py-1
                text-[12px] tracking-tight text-[var(--color-meta)]
                transition-colors hover:text-[var(--color-ink)]
                focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ember)]
              "
            >
              <span className="block h-[6px] w-[6px] rounded-full bg-[var(--color-ember)]" aria-hidden="true" />
              <span className="font-mono">{modelLabel}</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {busy && onAbort ? (
            <motion.button
              type="button"
              onClick={onAbort}
              whileTap={{ scale: 0.96 }}
              transition={spring.tactile}
              className="
                inline-flex items-center gap-2 rounded-full
                border border-[var(--color-hairline-strong)] bg-transparent
                px-3 h-9 text-[12px] tracking-tight text-[var(--color-ink)]
                hover:bg-[color-mix(in_srgb,var(--color-ink)_5%,transparent)]
              "
            >
              <span className="block h-2 w-2 rounded-[1px] bg-[var(--color-ember)]" aria-hidden="true" />
              Stop
            </motion.button>
          ) : (
            <motion.button
              key={pulse}
              type="button"
              onClick={submit}
              disabled={!canSend}
              whileTap={{ scale: 0.94 }}
              transition={spring.tactile}
              aria-label="Send message"
              className="
                inline-grid h-9 w-9 place-items-center rounded-full
                bg-[var(--color-ember)] text-[#FBF7EE]
                disabled:opacity-40 disabled:pointer-events-none
                hover:bg-[color-mix(in_srgb,var(--color-ember)_88%,#000_12%)]
                focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ember)]
              "
              style={pulse > 0 ? { animation: "ember-pulse 600ms var(--ease-out-quint)" } : undefined}
            >
              <SendArrow />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}

function SendArrow(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PaperclipGlyph(): React.JSX.Element {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M11 5.5 6.6 9.9a1.5 1.5 0 0 0 2.1 2.1l4.4-4.4a3 3 0 0 0-4.2-4.2L4.4 7.8a4.5 4.5 0 0 0 6.4 6.4l3.7-3.7"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ImageGlyph(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="5.5" cy="6.5" r="1" fill="currentColor" />
      <path d="M3 11l3-3 2.5 2.5L11 7l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}
