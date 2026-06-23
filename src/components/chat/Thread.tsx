"use client";

import * as React from "react";
import type { MessageAttachment } from "@/lib/types";
import { Message, type MessageStatus } from "./Message";

export interface ThreadEntry {
  id: string;
  role: "user" | "assistant";
  status: MessageStatus;
  /** Final content (when complete or after settling). */
  content?: string;
  /** Streaming chunks (assistant only, while status === "streaming"). */
  chunks?: string[];
  modelLabel?: string;
  errorMessage?: string;
  attachments?: MessageAttachment[];
}

export interface ThreadProps {
  entries: ThreadEntry[];
  /** Tail-anchor for autoscroll. */
  scrollAnchorRef: React.RefObject<HTMLDivElement | null>;
}

export function Thread({ entries, scrollAnchorRef }: ThreadProps): React.JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-0 px-5 pt-10 pb-10">
      {entries.map((entry, i) => {
        const messageProps = {
          role: entry.role,
          status: entry.status,
          flushTop: i === 0,
          ...(entry.content !== undefined ? { content: entry.content } : {}),
          ...(entry.chunks !== undefined ? { chunks: entry.chunks } : {}),
          ...(entry.modelLabel !== undefined ? { modelLabel: entry.modelLabel } : {}),
          ...(entry.errorMessage !== undefined ? { errorMessage: entry.errorMessage } : {}),
          ...(entry.attachments !== undefined ? { attachments: entry.attachments } : {}),
        };
        return <Message key={entry.id} {...messageProps} />;
      })}
      <div ref={scrollAnchorRef} aria-hidden="true" className="h-4" />
    </div>
  );
}
