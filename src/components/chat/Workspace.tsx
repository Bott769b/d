"use client";

import * as React from "react";
import type {
  ChatMessage,
  ConversationDetail,
  ConversationSummary,
  MessageAttachment,
  StreamFrame,
  UploadMeta,
} from "@/lib/types";
import {
  DEFAULT_MODEL_ID,
  MODELS,
  getModel,
  isValidModel,
  type ModelInfo,
} from "@/lib/models";
import { titleFromText } from "@/lib/title";
import { Header } from "./Header";
import { Composer } from "./Composer";
import { EmptyState } from "./EmptyState";
import { ModelPicker } from "./ModelPicker";
import { Sidebar } from "./Sidebar";
import { Thread, type ThreadEntry } from "./Thread";

const MODEL_STORAGE_KEY = "cavoti.model";

interface WorkspaceProps {
  initialModels: ModelInfo[];
  initialModelId: string;
}

export function Workspace({
  initialModels,
  initialModelId,
}: WorkspaceProps): React.JSX.Element {
  const [models] = React.useState<ModelInfo[]>(
    initialModels.length > 0 ? initialModels : MODELS,
  );
  const [modelId, setModelId] = React.useState<string>(initialModelId || DEFAULT_MODEL_ID);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [entries, setEntries] = React.useState<ThreadEntry[]>([]);
  const [busy, setBusy] = React.useState(false);

  // Conversation history.
  const [conversations, setConversations] = React.useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [listLoading, setListLoading] = React.useState(true);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const abortRef = React.useRef<AbortController | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const scrollAnchorRef = React.useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = React.useRef(true);

  // Restore model selection across reloads.
  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(MODEL_STORAGE_KEY);
      if (saved && getModel(saved)) setModelId(saved);
    } catch {
      /* private mode etc. */
    }
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(MODEL_STORAGE_KEY, modelId);
    } catch {
      /* noop */
    }
  }, [modelId]);

  // Load the conversation list once on mount.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/conversations");
        if (res.ok && !cancelled) {
          const data = (await res.json()) as { conversations: ConversationSummary[] };
          setConversations(data.conversations ?? []);
        }
      } catch {
        /* offline / db not ready — sidebar just stays empty */
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Track whether the user is pinned to the tail of the thread.
  React.useEffect(() => {
    const node = scrollAnchorRef.current;
    const root = scrollContainerRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) stickToBottomRef.current = entry.isIntersecting;
      },
      { root: root ?? null, threshold: 0.1 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Keep the tail in view as new tokens land (unless the user scrolled up).
  React.useEffect(() => {
    if (!stickToBottomRef.current) return;
    const node = scrollAnchorRef.current;
    if (!node) return;
    const id = window.requestAnimationFrame(() =>
      node.scrollIntoView({ block: "end", behavior: "smooth" }),
    );
    return () => window.cancelAnimationFrame(id);
  }, [entries]);

  const currentModel = React.useMemo(
    () => models.find((m) => m.id === modelId) ?? models[0],
    [models, modelId],
  );

  const activeTitle = React.useMemo(
    () => conversations.find((c) => c.id === activeId)?.title,
    [conversations, activeId],
  );

  const handleNewThread = React.useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setActiveId(null);
    setEntries([]);
    setBusy(false);
    setSidebarOpen(false);
  }, []);

  const handlePickModel = React.useCallback(
    (nextId: string) => {
      setModelId(nextId);
      setPickerOpen(false);
      // Persist the model choice on the active conversation, if any.
      if (activeId) {
        setConversations((prev) =>
          prev.map((c) => (c.id === activeId ? { ...c, modelId: nextId } : c)),
        );
        void fetch(`/api/conversations/${activeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modelId: nextId }),
        }).catch(() => {});
      }
    },
    [activeId],
  );

  const handleAbort = React.useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const selectConversation = React.useCallback(
    async (id: string) => {
      setSidebarOpen(false);
      if (id === activeId) return;
      abortRef.current?.abort();
      abortRef.current = null;
      setBusy(false);

      try {
        const res = await fetch(`/api/conversations/${id}`);
        if (!res.ok) return;
        const data = (await res.json()) as { conversation: ConversationDetail };
        const convo = data.conversation;
        setActiveId(convo.id);
        if (isValidModel(convo.modelId)) setModelId(convo.modelId);
        stickToBottomRef.current = true;
        setEntries(
          convo.messages.map<ThreadEntry>((m) => {
            const label = m.modelId ? getModel(m.modelId)?.label : undefined;
            return {
              id: m.id,
              role: m.role === "assistant" ? "assistant" : "user",
              status: "complete",
              content: m.content,
              ...(label ? { modelLabel: label } : {}),
              ...(m.attachments && m.attachments.length ? { attachments: m.attachments } : {}),
            };
          }),
        );
      } catch {
        /* leave current thread in place on failure */
      }
    },
    [activeId],
  );

  const deleteConversation = React.useCallback(
    async (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (id === activeId) {
        abortRef.current?.abort();
        setActiveId(null);
        setEntries([]);
        setBusy(false);
      }
      try {
        await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      } catch {
        /* optimistic remove already applied */
      }
    },
    [activeId],
  );

  const renameConversation = React.useCallback((id: string, title: string) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    void fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }).catch(() => {});
  }, []);

  const sendPrompt = React.useCallback(
    async (text: string, files: File[]) => {
      const trimmed = text.trim();
      if ((!trimmed && files.length === 0) || busy) return;

      const userEntryId = makeId();
      const assistantId = makeId();
      const modelLabel = currentModel?.label ?? modelId;

      // History to send: all settled turns plus the new user message.
      const messagesForApi: ChatMessage[] = [
        ...entries
          .filter((e) => e.status === "complete" && typeof e.content === "string")
          .map<ChatMessage>((e) => ({ role: e.role, content: e.content ?? "" })),
        { role: "user", content: trimmed },
      ];

      // Local previews for instant display (object URLs for images).
      const displayAttachments: MessageAttachment[] = files.map((f) => ({
        id: makeId(),
        name: f.name,
        mimeType: f.type || "application/octet-stream",
        kind: f.type.startsWith("image/") ? "image" : "file",
        url: f.type.startsWith("image/") ? URL.createObjectURL(f) : "",
      }));

      // Optimistic render first so the UI feels instant.
      setEntries((prev) => [
        ...prev,
        {
          id: userEntryId,
          role: "user",
          status: "complete",
          content: trimmed,
          ...(displayAttachments.length ? { attachments: displayAttachments } : {}),
        },
        { id: assistantId, role: "assistant", status: "thinking", chunks: [], modelLabel },
      ]);
      stickToBottomRef.current = true;
      setBusy(true);

      // Ensure a conversation row exists so the exchange can be persisted.
      let convId = activeId;
      if (!convId) {
        try {
          const res = await fetch("/api/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              modelId,
              title: titleFromText(trimmed || files[0]?.name || "New chat"),
            }),
          });
          if (res.ok) {
            const data = (await res.json()) as { conversation: ConversationSummary };
            convId = data.conversation.id;
            setActiveId(convId);
            setConversations((prev) => [data.conversation, ...prev]);
          }
        } catch {
          /* DB unavailable — proceed unsaved */
        }
      }

      // Upload attachments (if any) before streaming the reply.
      let chatAttachments: MessageAttachment[] = [];
      if (files.length) {
        try {
          const form = new FormData();
          for (const f of files) form.append("files", f);
          const up = await fetch("/api/upload", { method: "POST", body: form });
          if (!up.ok) {
            const detail = await safeReadJson(up);
            const msg =
              (detail && typeof detail === "object" && "error" in detail
                ? String((detail as { error: unknown }).error)
                : "") || `Upload failed (${up.status}).`;
            patchEntry(setEntries, assistantId, { status: "error", errorMessage: msg });
            setBusy(false);
            abortRef.current = null;
            return;
          }
          const data = (await up.json()) as { uploads: UploadMeta[] };
          chatAttachments = (data.uploads ?? []).map((u) => ({
            id: u.id,
            name: u.originalName,
            mimeType: u.mimeType,
            kind: u.kind,
            url: u.url,
          }));
          // Swap optimistic previews for the stored (stable) attachments.
          patchEntry(setEntries, userEntryId, { attachments: chatAttachments });
        } catch {
          patchEntry(setEntries, assistantId, {
            status: "error",
            errorMessage: "Upload failed: network error.",
          });
          setBusy(false);
          abortRef.current = null;
          return;
        }
      }

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelId,
            messages: messagesForApi,
            ...(convId ? { conversationId: convId } : {}),
            ...(chatAttachments.length ? { attachments: chatAttachments } : {}),
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const detail = await safeReadJson(res);
          const message =
            (detail && typeof detail === "object" && "error" in detail
              ? String((detail as { error: unknown }).error)
              : "") || `Request failed (${res.status}).`;
          patchEntry(setEntries, assistantId, { status: "error", errorMessage: message });
          return;
        }
        if (!res.body) {
          patchEntry(setEntries, assistantId, {
            status: "error",
            errorMessage: "No streaming body returned.",
          });
          return;
        }

        await consumeNdjson(res.body, controller.signal, (frame) => {
          if (frame.type === "delta") {
            patchEntry(setEntries, assistantId, (prev) => ({
              status: "streaming",
              chunks: [...(prev.chunks ?? []), frame.text],
            }));
          } else if (frame.type === "done") {
            patchEntry(setEntries, assistantId, (prev) => ({
              status: "complete",
              content: (prev.chunks ?? []).join(""),
              chunks: undefined,
            }));
            if (frame.conversation) applyConversationBump(setConversations, frame.conversation);
          } else if (frame.type === "error") {
            patchEntry(setEntries, assistantId, {
              status: "error",
              errorMessage: frame.message,
              chunks: undefined,
            });
          }
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          patchEntry(setEntries, assistantId, (prev) => ({
            status: prev.chunks && prev.chunks.length ? "complete" : "error",
            content: prev.chunks ? prev.chunks.join("") : "",
            chunks: undefined,
            ...(prev.chunks && prev.chunks.length ? {} : { errorMessage: "Stopped." }),
          }));
        } else {
          patchEntry(setEntries, assistantId, {
            status: "error",
            errorMessage: err instanceof Error ? err.message : "Network error.",
          });
        }
      } finally {
        abortRef.current = null;
        setBusy(false);
      }
    },
    [busy, currentModel, entries, modelId, activeId],
  );

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        loading={listLoading}
        onSelect={(id) => void selectConversation(id)}
        onNew={handleNewThread}
        onRename={renameConversation}
        onDelete={(id) => void deleteConversation(id)}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          modelLabel={currentModel?.label ?? modelId}
          onOpenModelPicker={() => setPickerOpen(true)}
          onNewThread={handleNewThread}
          onToggleSidebar={() => setSidebarOpen(true)}
          hasMessages={entries.length > 0}
          {...(activeTitle ? { activeTitle } : {})}
        />

        <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto">
          {entries.length === 0 ? (
            <EmptyState
              modelLabel={currentModel?.label ?? modelId}
              onPick={(prompt) => {
                void sendPrompt(prompt, []);
              }}
            />
          ) : (
            <Thread entries={entries} scrollAnchorRef={scrollAnchorRef} />
          )}
        </div>

        <div className="shrink-0 bg-gradient-to-t from-[var(--color-paper)] via-[var(--color-paper)] to-transparent pt-3">
          <Composer
            busy={busy}
            onSend={(text, files) => {
              void sendPrompt(text, files);
            }}
            onAbort={handleAbort}
            modelLabel={currentModel?.label ?? modelId}
            onOpenModelPicker={() => setPickerOpen(true)}
          />
        </div>
      </div>

      <ModelPicker
        open={pickerOpen}
        models={models}
        currentId={modelId}
        onSelect={handlePickModel}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

type EntryPatch = Partial<ThreadEntry> | ((prev: ThreadEntry) => Partial<ThreadEntry>);

function patchEntry(
  setEntries: React.Dispatch<React.SetStateAction<ThreadEntry[]>>,
  id: string,
  patch: EntryPatch,
): void {
  setEntries((prev) =>
    prev.map((entry) => {
      if (entry.id !== id) return entry;
      const partial = typeof patch === "function" ? patch(entry) : patch;
      return { ...entry, ...partial };
    }),
  );
}

/** Update a conversation's title/updatedAt from a done frame and reorder. */
function applyConversationBump(
  setConversations: React.Dispatch<React.SetStateAction<ConversationSummary[]>>,
  bump: { id: string; title: string; updatedAt: string },
): void {
  setConversations((prev) => {
    const next = prev.map((c) =>
      c.id === bump.id ? { ...c, title: bump.title, updatedAt: bump.updatedAt } : c,
    );
    next.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return next;
  });
}

async function consumeNdjson(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  onFrame: (frame: StreamFrame) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      if (signal.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let nl = buffer.indexOf("\n");
      while (nl !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (line.length) {
          try {
            onFrame(JSON.parse(line) as StreamFrame);
          } catch {
            // Best-effort: skip malformed frames rather than blow up the UI.
          }
        }
        nl = buffer.indexOf("\n");
      }
    }

    const tail = buffer.trim();
    if (tail.length) {
      try {
        onFrame(JSON.parse(tail) as StreamFrame);
      } catch {
        /* noop */
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* noop */
    }
  }
}

async function safeReadJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}
