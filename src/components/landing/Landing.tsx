"use client";

import * as React from "react";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "motion/react";
import { BrandMark } from "@/components/ui/BrandMark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { MODELS } from "@/lib/models";
import { ease } from "@/components/motion/easings";

export function Landing(): React.JSX.Element {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <Nav />
      <Hero />
      <Marquee />
      <Features />
      <ClosingCta />
      <Footer />
    </div>
  );
}

// ─── nav ─────────────────────────────────────────────────────────────────

function Nav(): React.JSX.Element {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: ease.outQuint }}
      className="fixed inset-x-0 top-0 z-40"
    >
      <div
        className={[
          "mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 transition-all duration-300 sm:px-8",
          scrolled
            ? "mt-2 rounded-full border border-[var(--color-hairline)] bg-[color-mix(in_srgb,var(--color-paper)_72%,transparent)] backdrop-blur-xl"
            : "mt-0 border border-transparent bg-transparent",
        ].join(" ")}
        style={scrolled ? { maxWidth: 1100 } : undefined}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <motion.span
            className="text-[var(--color-ember)]"
            whileHover={{ rotate: -12, scale: 1.08 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            <BrandMark size={22} />
          </motion.span>
          <span className="font-display text-[22px] leading-none tracking-[-0.01em]">Cavoti</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#models" className="draw-underline text-[13.5px] tracking-tight text-[var(--color-meta)] hover:text-[var(--color-ink)]">
            Models
          </a>
          <a href="#features" className="draw-underline text-[13.5px] tracking-tight text-[var(--color-meta)] hover:text-[var(--color-ink)]">
            Features
          </a>
          <a href="#close" className="draw-underline text-[13.5px] tracking-tight text-[var(--color-meta)] hover:text-[var(--color-ink)]">
            Get started
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="
              group inline-flex items-center gap-1.5 rounded-full
              bg-[var(--color-ink)] px-4 h-9 text-[13px] font-medium tracking-tight
              text-[var(--color-paper)] transition-transform
              hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ember)]
            "
          >
            Sign in
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="transition-transform group-hover:translate-x-0.5">
              <path d="M2 6h7M6 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}

// ─── hero ────────────────────────────────────────────────────────────────

const HEADLINE_LINE_1 = ["Every", "model.", "One", "calm"];
const HEADLINE_ACCENT = "surface.";

const wordContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};
const wordItem: Variants = {
  hidden: { opacity: 0, y: "0.5em", filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: ease.outQuint } },
};

function Hero(): React.JSX.Element {
  const ref = React.useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const yAccent = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  // Cursor-following glow.
  const gx = useMotionValue(50);
  const gy = useMotionValue(40);
  const sx = useSpring(gx, { stiffness: 60, damping: 18 });
  const sy = useSpring(gy, { stiffness: 60, damping: 18 });
  const glow = useTransform(
    [sx, sy],
    ([x, y]) =>
      `radial-gradient(420px circle at ${x}% ${y}%, color-mix(in srgb, var(--color-ember) 16%, transparent), transparent 60%)`,
  );

  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    gx.set(((e.clientX - r.left) / r.width) * 100);
    gy.set(((e.clientY - r.top) / r.height) * 100);
  };

  return (
    <section
      ref={ref}
      onMouseMove={onMove}
      className="relative flex min-h-dvh items-center justify-center px-5 pt-24 sm:px-8"
    >
      <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: glow }} />

      <motion.div style={{ opacity }} className="relative mx-auto w-full max-w-[1000px]">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: ease.outQuint }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--color-hairline)] bg-[color-mix(in_srgb,var(--color-paper-2)_60%,transparent)] px-3 py-1.5 text-[11.5px] uppercase tracking-[0.18em] text-[var(--color-meta)]"
        >
          <span className="block h-[6px] w-[6px] rounded-full bg-[var(--color-ember)]" />
          Claude · GPT · Gemini · DeepSeek · Grok
        </motion.p>

        <h1 className="text-[clamp(2.75rem,8vw,6rem)] font-semibold leading-[0.98] tracking-[-0.03em]">
          <motion.span variants={wordContainer} initial="hidden" animate="show" className="block">
            {HEADLINE_LINE_1.map((w, i) => (
              <motion.span key={i} variants={wordItem} className="mr-[0.25em] inline-block">
                {w}
              </motion.span>
            ))}
          </motion.span>
          <motion.span variants={wordContainer} initial="hidden" animate="show" className="block">
            <motion.span variants={wordItem} className="font-display text-[var(--color-ember)] inline-block">
              {HEADLINE_ACCENT}
            </motion.span>
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: ease.outQuint, delay: 0.5 }}
          className="mt-7 max-w-[46ch] text-[16px] leading-[1.7] text-[var(--color-meta)] sm:text-[17px]"
        >
          A writing-grade chat surface wired to the Cavoti relay. Fifteen frontier models,
          automatic key failover, every thread saved. Built for people who live in the cursor.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: ease.outQuint, delay: 0.62 }}
          className="mt-9 flex flex-wrap items-center gap-3"
        >
          <Link
            href="/login"
            className="
              group inline-flex items-center gap-2 rounded-full bg-[var(--color-ember)]
              px-6 h-12 text-[15px] font-medium text-[#FBF7EE] transition-transform
              hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ember)]
            "
          >
            Start writing
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform group-hover:translate-x-1">
              <path d="M2 7h9M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <a
            href="#features"
            className="
              inline-flex items-center gap-2 rounded-full border border-[var(--color-hairline-strong)]
              px-6 h-12 text-[15px] font-medium text-[var(--color-ink)] transition-colors
              hover:bg-[color-mix(in_srgb,var(--color-ink)_5%,transparent)]
            "
          >
            See how it flows
          </a>
        </motion.div>
      </motion.div>

      <motion.div
        style={{ y: yAccent }}
        className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2 text-[var(--color-meta)]"
        >
          <span className="text-[10.5px] uppercase tracking-[0.2em]">Scroll</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v9M3 7l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  );
}

// ─── marquee ───────────────────────────────────────────────────────────────

function Marquee(): React.JSX.Element {
  const items = [...MODELS, ...MODELS];
  return (
    <section id="models" className="border-y border-[var(--color-hairline)] py-6">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[var(--color-paper)] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[var(--color-paper)] to-transparent" />
        <motion.div
          className="flex w-max gap-10 whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
        >
          {items.map((m, i) => (
            <span key={i} className="flex items-center gap-3 text-[15px] tracking-tight text-[var(--color-meta)]">
              <span className="block h-[6px] w-[6px] rounded-full bg-[var(--color-ember)] opacity-70" />
              <span className="font-mono text-[var(--color-ink-2)]">{m.id}</span>
              <span className="text-[12px] uppercase tracking-[0.14em] opacity-60">{m.provider}</span>
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── features ──────────────────────────────────────────────────────────────

interface Feature {
  kicker: string;
  title: string;
  body: string;
  bullet: string[];
}

const FEATURES: Feature[] = [
  {
    kicker: "Resilience",
    title: "Keys that cover for each other",
    body: "Pool your relay keys and Cavoti routes each request to a key that actually serves the model — then fails over the instant one goes quiet.",
    bullet: ["Round-robin load spread", "Model-aware routing", "Silent failover mid-pool"],
  },
  {
    kicker: "Memory",
    title: "Nothing you write disappears",
    body: "Every exchange is saved the moment a reply lands. Reopen a thread weeks later and the room is exactly as you left it.",
    bullet: ["Local SQLite, your machine", "Rename and organise", "Pick up any thread"],
  },
  {
    kicker: "Craft",
    title: "An interface that gets out of the way",
    body: "Tokens settle onto the page like ink. Two themes, considered type, motion that means something. No clutter, no noise.",
    bullet: ["Streaming you can read", "Paper and ink themes", "Keyboard-first picker"],
  },
];

function Features(): React.JSX.Element {
  return (
    <section id="features" className="mx-auto max-w-[1100px] px-5 py-28 sm:px-8">
      <Reveal>
        <p className="text-[12px] uppercase tracking-[0.2em] text-[var(--color-meta)]">Why Cavoti</p>
        <h2 className="mt-3 max-w-[18ch] text-[clamp(2rem,5vw,3.4rem)] font-semibold leading-[1.02] tracking-[-0.02em]">
          Built like a tool you&apos;d actually keep open.
        </h2>
      </Reveal>

      <div className="mt-16 flex flex-col gap-4">
        {FEATURES.map((f, i) => (
          <FeatureCard key={f.title} feature={f} index={i} />
        ))}
      </div>
    </section>
  );
}

function FeatureCard({ feature, index }: { feature: Feature; index: number }): React.JSX.Element {
  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: ease.outQuint }}
      whileHover={{ y: -4 }}
      className="
        group grid gap-6 rounded-3xl border border-[var(--color-hairline)]
        bg-[color-mix(in_srgb,var(--color-paper-2)_50%,transparent)] p-8 sm:grid-cols-[auto_1fr] sm:p-10
        transition-colors hover:border-[var(--color-hairline-strong)]
      "
    >
      <div className="flex items-start gap-4">
        <span className="font-mono text-[13px] text-[var(--color-meta)]">0{index + 1}</span>
        <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-ember)]">{feature.kicker}</span>
      </div>
      <div>
        <h3 className="max-w-[20ch] text-[clamp(1.4rem,3vw,2rem)] font-semibold leading-[1.1] tracking-[-0.01em]">
          {feature.title}
        </h3>
        <p className="mt-4 max-w-[54ch] text-[15px] leading-[1.7] text-[var(--color-meta)]">{feature.body}</p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {feature.bullet.map((b) => (
            <li
              key={b}
              className="rounded-full border border-[var(--color-hairline)] px-3 py-1.5 text-[12.5px] text-[var(--color-ink-2)]"
            >
              {b}
            </li>
          ))}
        </ul>
      </div>
    </motion.article>
  );
}

// ─── closing cta ─────────────────────────────────────────────────────────

function ClosingCta(): React.JSX.Element {
  return (
    <section id="close" className="px-5 pb-28 sm:px-8">
      <Reveal>
        <div className="relative mx-auto max-w-[1100px] overflow-hidden rounded-[2rem] border border-[var(--color-hairline-strong)] bg-[var(--color-ink)] px-8 py-20 text-center sm:px-16">
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -inset-x-10 -top-1/2 h-[200%]"
            style={{
              background:
                "radial-gradient(600px circle at 50% 0%, color-mix(in srgb, var(--color-ember) 26%, transparent), transparent 60%)",
            }}
            animate={{ opacity: [0.5, 0.85, 0.5] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative">
            <h2 className="mx-auto max-w-[16ch] text-[clamp(2rem,5vw,3.6rem)] font-semibold leading-[1.02] tracking-[-0.02em] text-[var(--color-paper)]">
              The cursor is blinking. Go.
            </h2>
            <p className="mx-auto mt-5 max-w-[44ch] text-[15.5px] leading-[1.7] text-[color-mix(in_srgb,var(--color-paper)_70%,transparent)]">
              Sign in and start a thread. Admins land straight on the dashboard.
            </p>
            <Link
              href="/login"
              className="
                group mt-9 inline-flex items-center gap-2 rounded-full bg-[var(--color-ember)]
                px-7 h-12 text-[15px] font-medium text-[#FBF7EE] transition-transform hover:-translate-y-0.5
              "
            >
              Open the app
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform group-hover:translate-x-1">
                <path d="M2 7h9M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Footer(): React.JSX.Element {
  return (
    <footer className="border-t border-[var(--color-hairline)] px-5 py-10 sm:px-8">
      <div className="mx-auto flex max-w-[1100px] flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2 text-[var(--color-meta)]">
          <span className="text-[var(--color-ember)]">
            <BrandMark size={16} />
          </span>
          <span className="font-display text-[16px] text-[var(--color-ink)]">Cavoti</span>
          <span className="text-[12px]">· relay surface</span>
        </div>
        <p className="text-[12px] text-[var(--color-meta)]">Built for one writer, one machine.</p>
      </div>
    </footer>
  );
}

// ─── helper ────────────────────────────────────────────────────────────────

function Reveal({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: ease.outQuint }}
    >
      {children}
    </motion.div>
  );
}
