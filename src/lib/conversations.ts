import "server-only";
import { db } from "./db";
import { titleFromText } from "./title";
import type {
  ConversationSummary,
  ConversationDetail,
  MessageAttachment,
} from "./types";

export { titleFromText };

// Per-user persistence helpers. Every query is scoped by userId so one
// account can never see or touch another's threads.

const SUMMARY_SELECT = {
  id: true,
  title: true,
  modelId: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toIso(d: Date): string {
  return d.toISOString();
}

function toSummary(r: {
  id: string;
  title: string;
  modelId: string;
  createdAt: Date;
  updatedAt: Date;
}): ConversationSummary {
  return {
    id: r.id,
    title: r.title,
    modelId: r.modelId,
    createdAt: toIso(r.createdAt),
    updatedAt: toIso(r.updatedAt),
  };
}

function parseAttachments(raw: string | null): MessageAttachment[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as MessageAttachment[];
    return Array.isArray(parsed) && parsed.length ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function listConversations(userId: string): Promise<ConversationSummary[]> {
  const rows = await db.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: SUMMARY_SELECT,
  });
  return rows.map(toSummary);
}

export async function createConversation(
  userId: string,
  modelId: string,
  title?: string,
): Promise<ConversationSummary> {
  const row = await db.conversation.create({
    data: { userId, modelId, title: title?.trim() || "New chat" },
    select: SUMMARY_SELECT,
  });
  return toSummary(row);
}

export async function getConversation(
  id: string,
  userId: string,
): Promise<ConversationDetail | null> {
  const row = await db.conversation.findFirst({
    where: { id, userId },
    select: {
      ...SUMMARY_SELECT,
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          modelId: true,
          attachments: true,
          createdAt: true,
        },
      },
    },
  });
  if (!row) return null;
  return {
    ...toSummary(row),
    messages: row.messages.map((m) => {
      const attachments = parseAttachments(m.attachments);
      return {
        id: m.id,
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
        ...(m.modelId ? { modelId: m.modelId } : {}),
        ...(attachments ? { attachments } : {}),
        createdAt: m.createdAt.getTime(),
      };
    }),
  };
}

export async function updateConversation(
  id: string,
  userId: string,
  patch: { title?: string; modelId?: string },
): Promise<ConversationSummary | null> {
  const owned = await db.conversation.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) return null;

  const data: { title?: string; modelId?: string } = {};
  if (typeof patch.title === "string" && patch.title.trim()) {
    data.title = patch.title.trim().slice(0, 120);
  }
  if (typeof patch.modelId === "string") {
    data.modelId = patch.modelId;
  }
  if (Object.keys(data).length === 0) {
    const row = await db.conversation.findUnique({ where: { id }, select: SUMMARY_SELECT });
    return row ? toSummary(row) : null;
  }

  const row = await db.conversation.update({ where: { id }, data, select: SUMMARY_SELECT });
  return toSummary(row);
}

export async function deleteConversation(id: string, userId: string): Promise<boolean> {
  const result = await db.conversation.deleteMany({ where: { id, userId } });
  return result.count > 0;
}

/**
 * Persist one completed exchange (new user turn + assistant reply) for a
 * conversation the user owns. Stores any attachments on the user message,
 * bumps updatedAt, and sets the title on the first exchange. Returns the
 * refreshed summary, or null if the conversation isn't owned / doesn't exist.
 */
export async function persistExchange(args: {
  conversationId: string;
  userId: string;
  userContent: string;
  assistantContent: string;
  modelId: string;
  attachments?: MessageAttachment[];
}): Promise<{ id: string; title: string; updatedAt: string } | null> {
  const { conversationId, userId, userContent, assistantContent, modelId, attachments } = args;

  const convo = await db.conversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true, _count: { select: { messages: true } } },
  });
  if (!convo) return null;

  const isFirstExchange = convo._count.messages === 0;
  const attachmentsJson =
    attachments && attachments.length ? JSON.stringify(attachments) : null;

  const [, , updated] = await db.$transaction([
    db.message.create({
      data: {
        conversationId,
        role: "user",
        content: userContent,
        ...(attachmentsJson ? { attachments: attachmentsJson } : {}),
      },
    }),
    db.message.create({
      data: { conversationId, role: "assistant", content: assistantContent, modelId },
    }),
    db.conversation.update({
      where: { id: conversationId },
      data: {
        modelId,
        ...(isFirstExchange ? { title: titleFromText(userContent) } : {}),
      },
      select: { id: true, title: true, updatedAt: true },
    }),
  ]);

  return { id: updated.id, title: updated.title, updatedAt: toIso(updated.updatedAt) };
}
