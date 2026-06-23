"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import type { UploadMeta } from "@/lib/types";
import { BrandMark } from "@/components/ui/BrandMark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ease } from "@/components/motion/easings";
import { Uploader } from "./Uploader";

interface AdminDashboardProps {
  username: string;
}

export function AdminDashboard({ username }: AdminDashboardProps): React.JSX.Element {
  const [uploads, setUploads] = React.useState<UploadMeta[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/upload");
        if (res.ok && !cancelled) {
          const data = (await res.json()) as { uploads: UploadMeta[] };
          setUploads(data.uploads ?? []);
        }
      } catch {
        /* ignore — show empty */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFiles = React.useCallback((files: File[]) => {
    setError(null);
    setBusy(true);
    setProgress(0);

    const form = new FormData();
    for (const f of files) form.append("files", f);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress((e.loaded / e.total) * 100);
    };
    xhr.onload = () => {
      setBusy(false);
      setProgress(100);
      try {
        const data = JSON.parse(xhr.responseText) as { uploads?: UploadMeta[]; error?: string };
        if (xhr.status >= 200 && xhr.status < 300 && data.uploads) {
          setUploads((prev) => [...data.uploads!, ...prev]);
        } else {
          setError(data.error ?? `Upload failed (${xhr.status}).`);
        }
      } catch {
        setError("Upload failed: unexpected server response.");
      }
    };
    xhr.onerror = () => {
      setBusy(false);
      setError("Upload failed: network error.");
    };
    xhr.send(form);
  }, []);

  const handleDelete = React.useCallback(async (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
    try {
      await fetch(`/api/upload/${id}`, { method: "DELETE" });
    } catch {
      /* optimistic removal already applied */
    }
  }, []);

  const stats = React.useMemo(() => {
    const images = uploads.filter((u) => u.kind === "image").length;
    const totalBytes = uploads.reduce((s, u) => s + u.size, 0);
    return { total: uploads.length, images, files: uploads.length - images, totalBytes };
  }, [uploads]);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-[var(--color-hairline)] bg-[color-mix(in_srgb,var(--color-paper)_82%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="text-[var(--color-ember)]">
                <BrandMark size={20} />
              </span>
              <span className="font-display text-[20px] leading-none tracking-[-0.01em]">Cavoti</span>
            </Link>
            <span className="rounded-full border border-[var(--color-hairline-strong)] px-2.5 py-1 text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-ember)]">
              Admin
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-[13px] text-[var(--color-meta)] sm:inline">
              Signed in as <span className="font-mono text-[var(--color-ink-2)]">{username}</span>
            </span>
            <Link
              href="/chat"
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--color-hairline)] px-3 text-[12.5px] tracking-tight text-[var(--color-ink)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-ink)_5%,transparent)]"
            >
              Open chat
            </Link>
            <button
              type="button"
              onClick={() => {
                void fetch("/api/auth/logout", { method: "POST" }).finally(() =>
                  window.location.assign("/login"),
                );
              }}
              className="grid h-8 w-8 place-items-center rounded-full text-[var(--color-ink)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-ink)_6%,transparent)]"
              aria-label="Sign out"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 2H3.5A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14H6M10.5 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-5 py-10 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: ease.outQuint }}
        >
          <h1 className="font-display text-[clamp(2rem,5vw,3rem)] leading-[1.05] tracking-[-0.01em]">
            Dashboard
          </h1>
          <p className="mt-2 text-[14.5px] text-[var(--color-meta)]">
            Upload and manage files and images. Stored locally and served from your machine.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Items" value={String(stats.total)} delay={0.05} />
          <Stat label="Images" value={String(stats.images)} delay={0.1} />
          <Stat label="Files" value={String(stats.files)} delay={0.15} />
          <Stat label="Total size" value={formatBytes(stats.totalBytes)} delay={0.2} />
        </div>

        {/* Uploader */}
        <div className="mt-6">
          <Uploader busy={busy} progress={progress} onFiles={handleFiles} />
          <AnimatePresence>
            {error ? (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                role="alert"
                className="mt-3 rounded-lg border border-[color-mix(in_srgb,var(--color-ember)_32%,transparent)] bg-[color-mix(in_srgb,var(--color-ember)_8%,transparent)] px-3 py-2 text-[13px] text-[var(--color-ink)]"
              >
                {error}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Library */}
        <div className="mt-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-[15px] font-medium tracking-tight text-[var(--color-ink)]">Library</h2>
            <span className="text-[12px] text-[var(--color-meta)]">
              {loading ? "Loading…" : `${stats.total} item${stats.total === 1 ? "" : "s"}`}
            </span>
          </div>

          {loading ? (
            <SkeletonGrid />
          ) : uploads.length === 0 ? (
            <p className="rounded-2xl border border-[var(--color-hairline)] px-5 py-10 text-center text-[13.5px] text-[var(--color-meta)]">
              Nothing uploaded yet. Drop a file above to get started.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <AnimatePresence>
                {uploads.map((u) => (
                  <UploadCard key={u.id} upload={u} onDelete={() => handleDelete(u.id)} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, delay }: { label: string; value: string; delay: number }): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: ease.outQuint, delay }}
      className="rounded-2xl border border-[var(--color-hairline)] bg-[color-mix(in_srgb,var(--color-paper-2)_45%,transparent)] px-4 py-3.5"
    >
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-meta)]">{label}</p>
      <p className="mt-1 font-display text-[24px] leading-none text-[var(--color-ink)]">{value}</p>
    </motion.div>
  );
}

function UploadCard({ upload, onDelete }: { upload: UploadMeta; onDelete: () => void }): React.JSX.Element {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.28, ease: ease.outQuint }}
      className="group relative overflow-hidden rounded-2xl border border-[var(--color-hairline)] bg-[color-mix(in_srgb,var(--color-paper-2)_55%,transparent)]"
    >
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-[color-mix(in_srgb,var(--color-ink)_4%,transparent)]">
        {upload.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={upload.url}
            alt={upload.originalName}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <FileGlyph mime={upload.mimeType} />
        )}
      </div>

      <div className="flex items-start justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-medium text-[var(--color-ink)]" title={upload.originalName}>
            {upload.originalName}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--color-meta)]">{formatBytes(upload.size)}</p>
        </div>
        <a
          href={upload.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open file"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[var(--color-meta)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-ink)_8%,transparent)] hover:text-[var(--color-ink)]"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M5 2H2v10h10V9M9 2h3v3M12 2 6 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>

      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete"
        className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-paper)_70%,transparent)] text-[var(--color-ink)] opacity-0 backdrop-blur transition-opacity hover:bg-[var(--color-ember)] hover:text-[#FBF7EE] group-hover:opacity-100"
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M3 4h8M5.5 4V3h3v1M5 4l.4 7h3.2L9 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </motion.div>
  );
}

function FileGlyph({ mime }: { mime: string }): React.JSX.Element {
  const ext = mime.split("/")[1]?.slice(0, 4).toUpperCase() ?? "FILE";
  return (
    <div className="flex flex-col items-center gap-2 text-[var(--color-meta)]">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 2h7l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M13 2v5h5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
      <span className="font-mono text-[10px] tracking-wide">{ext}</span>
    </div>
  );
}

function SkeletonGrid(): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="aspect-[4/3] animate-pulse rounded-2xl bg-[color-mix(in_srgb,var(--color-ink)_5%,transparent)]"
          style={{ animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}
