// Shared types for the Cavoti chat surface. Server, client, and API routes
// all reference these so the wire format stays honest.

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ClientMessage {
  id: string;
  role: ChatRole;
  content: string;
  modelId?: string;
  attachments?: MessageAttachment[];
  /** unix ms */
  createdAt: number;
}

/** An uploaded file referenced by a chat message. */
export interface MessageAttachment {
  id: string; // upload id
  name: string; // original filename
  mimeType: string;
  kind: "image" | "file";
  url: string; // authenticated URL: /api/files/<id>
}

/** OpenAI-style multimodal content part (for sending images to vision models). */
export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

/** A message as sent on the wire to the relay; content may be multimodal. */
export interface RelayMessage {
  role: ChatRole;
  content: string | ContentPart[];
}

export interface SendChatBody {
  modelId: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** When set, the route persists the new turn + reply to this conversation. */
  conversationId?: string;
  /** Files attached to the new user turn (already uploaded). */
  attachments?: MessageAttachment[];
}

export interface UsageBlock {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/** A conversation as shown in the sidebar (no messages). */
export interface ConversationSummary {
  id: string;
  title: string;
  modelId: string;
  createdAt: string;
  updatedAt: string;
}

/** A conversation with its full message history. */
export interface ConversationDetail extends ConversationSummary {
  messages: ClientMessage[];
}

/** Uploaded file metadata returned by /api/upload. */
export interface UploadMeta {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  kind: "image" | "file";
  /** Public URL where the file is served. */
  url: string;
  createdAt: string;
}

/**
 * NDJSON frame written by /api/chat. Each frame is one JSON object terminated
 * by a single newline. The client reads them line-by-line, which keeps the
 * parser trivial and side-steps SSE quirks.
 */
export type StreamFrame =
  | { type: "delta"; text: string }
  | {
      type: "done";
      finish_reason: string | null;
      usage?: UsageBlock;
      model?: string;
      requestId?: string;
      /** Present when the turn was persisted; lets the client refresh titles. */
      conversation?: { id: string; title: string; updatedAt: string };
    }
  | { type: "error"; code: string; message: string; requestId?: string };
