// Client-safe title derivation. Lives apart from conversations.ts (which is
// server-only) so both the API layer and the browser can compute the same
// title without pulling Prisma into the client bundle.

export function titleFromText(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (!oneLine) return "New chat";
  return oneLine.length > 48 ? `${oneLine.slice(0, 48)}…` : oneLine;
}
