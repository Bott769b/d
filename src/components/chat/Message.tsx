"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ease } from "@/components/motion/easings";
import type { MessageAttachment } from "@/lib/types";
import { ThinkingMark } from "./ThinkingMark";
import { Markdown } from "./Markdown";

export type MessageStatus = "complete" | "streaming" | "thinking" | "error";

export interface MessageProps {
  role: "user" | "assistant";
  content?: string;
  chunks?: string[];
  status: MessageStatus;
  modelLabel?: string;
  errorMessage?: string;
  attachments?: MessageAttachment[];
  flushTop?: boolean;
}

export function Message({
  role,
  content,
  chunks,
  status,
  modelLabel,
  errorMessage,
  attachments,
  flushTop,
}: MessageProps): React.JSX.Element {
  const isUser = role === "user";

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: ease.outQuint }}
      className={[
        "group/message flex w-full flex-col",
        isUser ? "items-end" : "items-start",
        flushTop ? "pt-0" : "pt-8",
      ].join(" ")}
    >
      <div
        className={[
          "mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em]",
          "text-[var(--color-meta)]",
          isUser ? "justify-end" : "justify-start",
        ].join(" ")}
      >
        {isUser ? (
          <span>You</span>
        ) : (
          <>
            <span className="block h-[3px] w-[3px] rounded-full bg-[var(--color-ember)]" aria-hidden="true" />
            <span className="font-mono normal-case tracking-normal text-[12px] text-[var(--color-meta)]">
              {modelLabel ?? "assistant"}
            </span>
          </>
        )}
      </div>

      {attachments && attachments.length ? (
        <Attachments attachments={attachments} alignEnd={isUser} />
      ) : null}

      {(content || status !== "complete" || (chunks && chunks.length)) ? (
        <div
          className={[
            "max-w-[68ch] text-[15.5px] leading-[1.65]",
            isUser ? "text-[var(--color-ink)]" : "text-[var(--color-ink-2)]",
          ].join(" ")}
        >
          {status === "thinking" ? (
            <ThinkingMark />
          ) : status === "error" ? (
            <ErrorBlock message={errorMessage ?? "Something didn't land."} />
          ) : isUser ? (
            <div className="whitespace-pre-wrap break-words">{content ?? ""}</div>
          ) : status === "streaming" ? (
            <Markdown text={(chunks ?? []).join("")} cursor />
          ) : (
            <Markdown text={content ?? ""} />
          )}
        </div>
      ) : null}
    </motion.article>
  );
}

function Attachments({
  attachments,
  alignEnd,
}: {
  attachments: MessageAttachment[];
  alignEnd: boolean;
}): React.JSX.Element {
  return (
    <div className={["mb-2 flex max-w-[68ch] flex-wrap gap-2", alignEnd ? "justify-end" : "justify-start"].join(" ")}>
      {attachments.map((a) =>
        a.kind === "image" && a.url ? (
          <a
            key={a.id}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-xl border border-[var(--color-hairline)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={a.url}
              alt={a.name}
              className="h-28 w-28 object-cover transition-transform duration-300 hover:scale-105"
            />
          </a>
        ) : (
          <a
            key={a.id}
            href={a.url || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-[240px] items-center gap-2 rounded-xl border border-[var(--color-hairline)] bg-[color-mix(in_srgb,var(--color-paper-2)_60%,transparent)] px-3 py-2 text-[12.5px] text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-hairline-strong)]"
          >
            <span aria-hidden className="text-[var(--color-ember)]">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 2h5l4 4v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="truncate">{a.name}</span>
          </a>
        ),
      )}
    </div>
  );
}

function ErrorBlock({ message }: { message: string }): React.JSX.Element {
  return (
    <div
      className="
        rounded-md border border-[color-mix(in_srgb,var(--color-ember)_30%,transparent)]
        bg-[color-mix(in_srgb,var(--color-ember)_8%,transparent)]
        px-3 py-2 text-[13px] text-[var(--color-ink)]
      "
      role="alert"
    >
      {message}
    </div>
  );
}
