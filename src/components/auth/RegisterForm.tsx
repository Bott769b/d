"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { BrandMark } from "@/components/ui/BrandMark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ease, spring } from "@/components/motion/easings";

export function RegisterForm(): React.JSX.Element {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!username.trim() || !password) {
      setError("Pick a username and password.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { redirectTo?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
        setBusy(false);
        return;
      }
      window.location.assign(data.redirectTo ?? "/chat");
    } catch {
      setError("Could not reach the server. Try again.");
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col">
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        style={{
          background:
            "radial-gradient(560px circle at 82% 18%, color-mix(in srgb, var(--color-ember) 12%, transparent), transparent 55%), radial-gradient(620px circle at 12% 88%, color-mix(in srgb, var(--color-ember-soft) 9%, transparent), transparent 55%)",
        }}
      />

      <div className="relative flex items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-[var(--color-ember)]">
            <BrandMark size={20} />
          </span>
          <span className="font-display text-[20px] leading-none tracking-[-0.01em]">Cavoti</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="relative flex flex-1 items-center justify-center px-5 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: ease.outQuint }}
          className="w-full max-w-[420px]"
        >
          <div className="mb-8">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: ease.outQuint, delay: 0.1 }}
              className="font-display text-[clamp(2rem,7vw,2.75rem)] leading-[1.05] tracking-[-0.01em]"
            >
              Make an account.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: ease.outQuint, delay: 0.18 }}
              className="mt-2 text-[14.5px] text-[var(--color-meta)]"
            >
              Your threads stay yours — saved and private to you.
            </motion.p>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Username" htmlFor="r-username" delay={0.24}>
              <input
                id="r-username"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="pick a handle"
                className="login-input"
              />
            </Field>
            <Field label="Password" htmlFor="r-password" delay={0.3}>
              <input
                id="r-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="at least 4 characters"
                className="login-input"
              />
            </Field>
            <Field label="Confirm password" htmlFor="r-confirm" delay={0.36}>
              <input
                id="r-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="type it again"
                className="login-input"
              />
            </Field>

            <AnimatePresence>
              {error ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: ease.outQuint }}
                  className="overflow-hidden"
                >
                  <p
                    role="alert"
                    className="rounded-lg border border-[color-mix(in_srgb,var(--color-ember)_32%,transparent)] bg-[color-mix(in_srgb,var(--color-ember)_8%,transparent)] px-3 py-2 text-[13px] text-[var(--color-ink)]"
                  >
                    {error}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={busy}
              whileTap={{ scale: 0.98 }}
              transition={spring.tactile}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="
                mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-xl
                bg-[var(--color-ember)] text-[15px] font-medium text-[#FBF7EE]
                transition-colors hover:bg-[color-mix(in_srgb,var(--color-ember)_88%,#000_12%)]
                disabled:opacity-60 disabled:cursor-not-allowed
                focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ember)]
              "
              style={{ transitionDelay: "0.42s" }}
            >
              {busy ? (
                <>
                  <Spinner /> Creating…
                </>
              ) : (
                "Create account"
              )}
            </motion.button>
          </form>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.6 }}
            className="mt-6 text-center text-[13px] text-[var(--color-meta)]"
          >
            Already have an account?{" "}
            <Link href="/login" className="draw-underline text-[var(--color-ink)]" data-active="true">
              Sign in
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  delay,
  children,
}: {
  label: string;
  htmlFor: string;
  delay: number;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: ease.outQuint, delay }}
      className="flex flex-col gap-1.5"
    >
      <label htmlFor={htmlFor} className="text-[12px] uppercase tracking-[0.14em] text-[var(--color-meta)]">
        {label}
      </label>
      {children}
    </motion.div>
  );
}

function Spinner(): React.JSX.Element {
  return (
    <motion.span
      className="block h-3.5 w-3.5 rounded-full border-2 border-[#FBF7EE] border-t-transparent"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
    />
  );
}
