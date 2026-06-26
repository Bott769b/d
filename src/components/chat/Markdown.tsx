"use client";

import * as React from "react";

/**
 * Dependency-free Markdown renderer for assistant replies.
 *
 * Why hand-rolled instead of react-markdown? The app is deliberately
 * self-contained (no extra install step, see lib/cavoti.ts), and a chat
 * surface only needs a focused subset of Markdown. This covers the bits that
 * actually matter for coding answers: fenced code blocks (with a language
 * label + copy button), inline code, bold/italic, headings, lists,
 * blockquotes, links, images and rules.
 *
 * It is also streaming-safe: an unterminated code fence is auto-closed at the
 * end of the input, so a block being typed out renders as code immediately
 * instead of flashing as plain text.
 *
 * Deliberate omission: underscore emphasis (_x_ / __x__). Coding content is
 * full of snake_case identifiers (user_id, max_tokens, ...) and treating
 * those as emphasis would wreck the output. Only * and ** are honoured.
 */

interface MarkdownProps {
  text: string;
  /** Append a pulsing cursor to the final block (used while streaming). */
  cursor?: boolean;
}

export function Markdown({ text, cursor = false }: MarkdownProps): React.JSX.Element {
  const blocks = React.useMemo(() => parseBlocks(text), [text]);
  return <div className="md">{renderBlocks(blocks, cursor)}</div>;
}

// ─── block model ────────────────────────────────────────────────────────────

type Block =
  | { kind: "code"; lang: string; code: string }
  | { kind: "heading"; level: number; text: string }
  | { kind: "hr" }
  | { kind: "quote"; lines: string[] }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "para"; lines: string[] };

const RE = {
  fence: /^(\s*)(`{3,}|~{3,})(.*)$/,
  fenceClose: /^(\s*)(`{3,}|~{3,})\s*$/,
  blank: /^\s*$/,
  heading: /^(#{1,6})\s+(.*)$/,
  hr: /^\s{0,3}([-*_])(\s*\1){2,}\s*$/,
  quote: /^\s{0,3}>/,
  ul: /^(\s{0,3})[-*+]\s+(.*)$/,
  ol: /^(\s{0,3})\d+[.)]\s+(.*)$/,
} as const;

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    // Fenced code block.
    const fence = RE.fence.exec(line);
    if (fence) {
      const ticks = fence[2] ?? "```";
      const marker = ticks.charAt(0);
      const fenceLen = ticks.length;
      const lang = (fence[3] ?? "").trim().split(/\s+/)[0] ?? "";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length) {
        const l = lines[i] ?? "";
        const close = RE.fenceClose.exec(l);
        if (close && (close[2] ?? "").charAt(0) === marker && (close[2] ?? "").length >= fenceLen) {
          i++; // consume the closing fence
          break;
        }
        codeLines.push(l);
        i++;
      }
      blocks.push({ kind: "code", lang, code: codeLines.join("\n") });
      continue;
    }

    if (RE.blank.test(line)) {
      i++;
      continue;
    }

    const heading = RE.heading.exec(line);
    if (heading) {
      blocks.push({ kind: "heading", level: (heading[1] ?? "#").length, text: (heading[2] ?? "").trim() });
      i++;
      continue;
    }

    if (RE.hr.test(line)) {
      blocks.push({ kind: "hr" });
      i++;
      continue;
    }

    if (RE.quote.test(line)) {
      const ql: string[] = [];
      while (i < lines.length && RE.quote.test(lines[i] ?? "")) {
        ql.push((lines[i] ?? "").replace(/^\s{0,3}>\s?/, ""));
        i++;
      }
      blocks.push({ kind: "quote", lines: ql });
      continue;
    }

    const isUl = RE.ul.test(line);
    const isOl = RE.ol.test(line);
    if (isUl || isOl) {
      const ordered = isOl;
      const re = ordered ? RE.ol : RE.ul;
      const items: string[] = [];
      while (i < lines.length) {
        const cur = lines[i] ?? "";
        const m = re.exec(cur);
        if (m) {
          items.push(m[2] ?? "");
          i++;
        } else if (/^\s+\S/.test(cur) && items.length) {
          // Continuation line for the previous item.
          items[items.length - 1] += "\n" + cur.replace(/^\s+/, "");
          i++;
        } else {
          break;
        }
      }
      blocks.push({ kind: "list", ordered, items });
      continue;
    }

    // Paragraph: gather until a blank line or the start of another block.
    const pl: string[] = [];
    while (i < lines.length) {
      const cur = lines[i] ?? "";
      if (
        RE.blank.test(cur) ||
        RE.fence.test(cur) ||
        RE.heading.test(cur) ||
        RE.hr.test(cur) ||
        RE.quote.test(cur) ||
        RE.ul.test(cur) ||
        RE.ol.test(cur)
      ) {
        break;
      }
      pl.push(cur);
      i++;
    }
    if (pl.length) blocks.push({ kind: "para", lines: pl });
    else i++; // safety: never stall
  }

  return blocks;
}

// ─── block rendering ─────────────────────────────────────────────────────────

function renderBlocks(blocks: Block[], cursor: boolean): React.ReactNode[] {
  return blocks.map((b, idx) => {
    const showCursor = cursor && idx === blocks.length - 1;
    const key = `b${idx}`;

    switch (b.kind) {
      case "code":
        return <CodeBlock key={key} lang={b.lang} code={b.code} />;

      case "hr":
        return <hr key={key} className="md-hr" />;

      case "heading": {
        const inner = withCursor(parseInline(b.text, key), showCursor);
        if (b.level <= 1) return <h1 key={key} className="md-h1">{inner}</h1>;
        if (b.level === 2) return <h2 key={key} className="md-h2">{inner}</h2>;
        return <h3 key={key} className="md-h3">{inner}</h3>;
      }

      case "quote":
        return (
          <blockquote key={key} className="md-quote">
            {renderLines(b.lines, key)}
          </blockquote>
        );

      case "list": {
        const items = b.items.map((it, j) => (
          <li key={j}>{renderLines(it.split("\n"), `${key}-${j}`)}</li>
        ));
        return b.ordered ? (
          <ol key={key} className="md-ol">{items}</ol>
        ) : (
          <ul key={key} className="md-ul">{items}</ul>
        );
      }

      case "para":
        return (
          <p key={key} className="md-p">
            {withCursor(renderLines(b.lines, key), showCursor)}
          </p>
        );

      default:
        return null;
    }
  });
}

function withCursor(nodes: React.ReactNode[], show: boolean): React.ReactNode[] {
  if (!show) return nodes;
  return [...nodes, <span key="cursor" className="cursor-mark" aria-hidden="true" />];
}

function renderLines(lines: string[], keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  lines.forEach((ln, j) => {
    if (j > 0) out.push(<br key={`${keyPrefix}-br${j}`} />);
    out.push(...parseInline(ln, `${keyPrefix}-${j}`));
  });
  return out;
}

// ─── inline rendering ────────────────────────────────────────────────────────

type InlineKind = "code" | "image" | "link" | "bold" | "strike" | "italic";

const INLINE: Array<{ kind: InlineKind; re: RegExp }> = [
  { kind: "code", re: /`([^`]+)`/ },
  { kind: "image", re: /!\[([^\]]*)\]\(([^)\s]+)\)/ },
  { kind: "link", re: /\[([^\]]+)\]\(([^)\s]+)\)/ },
  { kind: "bold", re: /\*\*(\S(?:[^]*?\S)?)\*\*/ },
  { kind: "strike", re: /~~(\S(?:[^]*?\S)?)~~/ },
  { kind: "italic", re: /\*(\S(?:[^]*?\S)?)\*/ },
];

function parseInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let rest = text;
  let counter = 0;

  while (rest.length) {
    let bestIdx = -1;
    let bestKind: InlineKind | null = null;
    let bestMatch: RegExpExecArray | null = null;

    for (const pat of INLINE) {
      const m = pat.re.exec(rest);
      if (m && m.index !== undefined && (bestIdx === -1 || m.index < bestIdx)) {
        bestIdx = m.index;
        bestKind = pat.kind;
        bestMatch = m;
      }
    }

    if (bestMatch === null || bestKind === null || bestIdx === -1) {
      nodes.push(rest);
      break;
    }

    if (bestIdx > 0) nodes.push(rest.slice(0, bestIdx));

    const key = `${keyPrefix}-i${counter++}`;
    const m = bestMatch;

    switch (bestKind) {
      case "code":
        nodes.push(
          <code key={key} className="md-code-inline">
            {m[1] ?? ""}
          </code>,
        );
        break;
      case "image":
        nodes.push(
          // eslint-disable-next-line @next/next/no-img-element
          <img key={key} src={safeHref(m[2] ?? "")} alt={m[1] ?? ""} className="md-img" loading="lazy" />,
        );
        break;
      case "link":
        nodes.push(
          <a key={key} href={safeHref(m[2] ?? "")} target="_blank" rel="noopener noreferrer nofollow" className="md-link">
            {parseInline(m[1] ?? "", key)}
          </a>,
        );
        break;
      case "bold":
        nodes.push(<strong key={key}>{parseInline(m[1] ?? "", key)}</strong>);
        break;
      case "strike":
        nodes.push(<del key={key}>{parseInline(m[1] ?? "", key)}</del>);
        break;
      case "italic":
        nodes.push(<em key={key}>{parseInline(m[1] ?? "", key)}</em>);
        break;
    }

    rest = rest.slice(bestIdx + m[0].length);
  }

  return nodes;
}

function safeHref(href: string): string {
  const h = href.trim();
  if (/^(https?:|mailto:|tel:|#|\/)/i.test(h)) return h;
  // Block unknown schemes (javascript:, data:, ...) but keep relative paths.
  if (/^[a-z][a-z0-9+.-]*:/i.test(h)) return "#";
  return h;
}

// ─── code block + copy ───────────────────────────────────────────────────────

function CodeBlock({ lang, code }: { lang: string; code: string }): React.JSX.Element {
  return (
    <div className="md-codeblock">
      <div className="md-codeblock-bar">
        <span className="md-codeblock-lang">{lang || "code"}</span>
        <CopyButton value={code} />
      </div>
      <pre className="md-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function CopyButton({ value }: { value: string }): React.JSX.Element {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const onCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable (insecure context / denied) — ignore */
    }
  }, [value]);

  return (
    <button type="button" onClick={onCopy} className="md-copy" aria-label="Copy code to clipboard">
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
