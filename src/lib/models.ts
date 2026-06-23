// The 15 models LO targets for cavoti-web. Order matters here: the picker
// renders provider blocks in this order, and within a block the entries
// appear in the order declared.

export type Provider = "Anthropic" | "OpenAI" | "DeepSeek" | "Zhipu" | "xAI";
export type Tier = "ultra" | "premium" | "pro";

export interface ModelInfo {
  id: string;
  label: string;
  provider: Provider;
  tier: Tier;
  /** One-line description shown under the label in the picker. */
  blurb: string;
}

export const MODELS: ModelInfo[] = [
  // ── Anthropic ────────────────────────────────────────────────────────────
  {
    id: "claude-opus-4-8",
    label: "Claude Opus 4.8",
    provider: "Anthropic",
    tier: "ultra",
    blurb: "Latest Opus. Patient prose, careful reasoning.",
  },
  {
    id: "claude-opus-4-7",
    label: "Claude Opus 4.7",
    provider: "Anthropic",
    tier: "ultra",
    blurb: "Opus with grounded retrieval baked in.",
  },
  {
    id: "claude-opus-4-6",
    label: "Claude Opus 4.6",
    provider: "Anthropic",
    tier: "ultra",
    blurb: "Steady Opus from the previous wave.",
  },
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    provider: "Anthropic",
    tier: "premium",
    blurb: "Faster Claude. Excellent for drafts.",
  },

  // ── OpenAI ──────────────────────────────────────────────────────────────
  {
    id: "gpt-5.5-pro",
    label: "GPT-5.5 Pro",
    provider: "OpenAI",
    tier: "ultra",
    blurb: "Heaviest GPT. Long-form, deep code.",
  },
  {
    id: "gpt-5.5",
    label: "GPT-5.5",
    provider: "OpenAI",
    tier: "ultra",
    blurb: "Flagship general model.",
  },
  {
    id: "gpt-5.4",
    label: "GPT-5.4",
    provider: "OpenAI",
    tier: "premium",
    blurb: "All-rounder. The default for most chats.",
  },
  {
    id: "gpt-5.4-mini",
    label: "GPT-5.4 Mini",
    provider: "OpenAI",
    tier: "pro",
    blurb: "Fast, cheap, sharp enough.",
  },
  {
    id: "gpt-5.3-codex-spark",
    label: "GPT-5.3 Codex Spark",
    provider: "OpenAI",
    tier: "pro",
    blurb: "Code-tuned. Ranges, refactors, riffs.",
  },

  // ── DeepSeek ────────────────────────────────────────────────────────────
  {
    id: "deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
    provider: "DeepSeek",
    tier: "premium",
    blurb: "Reasoner core. Slow, considered, strong.",
  },
  {
    id: "deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    provider: "DeepSeek",
    tier: "pro",
    blurb: "Lean, fast, surprisingly capable.",
  },

  // ── Zhipu (GLM) ─────────────────────────────────────────────────────────
  {
    id: "glm-5.2",
    label: "GLM 5.2",
    provider: "Zhipu",
    tier: "premium",
    blurb: "Bilingual native. Strong on Mandarin.",
  },
  {
    id: "glm-5.1",
    label: "GLM 5.1",
    provider: "Zhipu",
    tier: "premium",
    blurb: "Steady GLM from the previous release.",
  },

  // ── xAI ─────────────────────────────────────────────────────────────────
  {
    id: "grok-4.3",
    label: "Grok 4.3",
    provider: "xAI",
    tier: "premium",
    blurb: "Latest Grok. Sharp tongue, current refs.",
  },
  {
    id: "grok-build-0.1",
    label: "Grok Build 0.1",
    provider: "xAI",
    tier: "pro",
    blurb: "Builder preview. Tools-leaning.",
  },
];

export const PROVIDER_ORDER: Provider[] = ["Anthropic", "OpenAI", "DeepSeek", "Zhipu", "xAI"];

const BY_ID = new Map(MODELS.map((m) => [m.id, m]));

export function getModel(id: string): ModelInfo | undefined {
  return BY_ID.get(id);
}

export function isValidModel(id: string): boolean {
  return BY_ID.has(id);
}

export const DEFAULT_MODEL_ID: string = "gpt-5.4";

/** For the small dot next to a model name. */
export const TIER_COLOR: Record<Tier, string> = {
  ultra: "var(--color-ember)",
  premium: "var(--color-ink)",
  pro: "var(--color-meta)",
};

export const TIER_LABEL: Record<Tier, string> = {
  ultra: "Ultra",
  premium: "Premium",
  pro: "Pro",
};

export function groupByProvider(models: ModelInfo[]): Array<{ provider: Provider; models: ModelInfo[] }> {
  const buckets = new Map<Provider, ModelInfo[]>();
  for (const m of models) {
    const list = buckets.get(m.provider) ?? [];
    list.push(m);
    buckets.set(m.provider, list);
  }
  return PROVIDER_ORDER.filter((p) => buckets.has(p)).map((provider) => ({
    provider,
    models: buckets.get(provider)!,
  }));
}
