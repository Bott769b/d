// Centralised motion timings. Components reach for these so the whole app
// breathes with the same rhythm. Values mirror the CSS custom properties in
// globals.css.

export const ease = {
  outQuint: [0.22, 1, 0.36, 1] as const,
  inQuint: [0.64, 0, 0.78, 0] as const,
  outBack: [0.34, 1.56, 0.64, 1] as const,
  inOutWarm: [0.65, 0, 0.35, 1] as const,
};

export const spring = {
  /** Tactile press — overshoots ~5%. */
  tactile: { type: "spring" as const, stiffness: 360, damping: 22, mass: 0.6 },
  /** Quick travel for popovers and pickers. */
  pop: { type: "spring" as const, stiffness: 340, damping: 30, mass: 0.7 },
  /** Slow, settled — for layout shifts. */
  settle: { type: "spring" as const, stiffness: 220, damping: 28 },
};

export const duration = {
  fast: 0.18,
  base: 0.32,
  slow: 0.54,
};
