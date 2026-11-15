/** Shared snappy motion presets — short durations, light travel. */
export const snap = {
  duration: 0.16,
  ease: [0.22, 1, 0.36, 1] as const,
};

export const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export function stagger(i: number, step = 0.025) {
  return { ...snap, delay: Math.min(i, 10) * step };
}
