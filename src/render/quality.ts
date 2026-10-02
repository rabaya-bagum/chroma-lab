/**
 * Adaptive visual quality. The board watches its own frame times and, if it
 * cannot hold roughly 45 fps, drops to a lighter tier: the idle shimmer runs at
 * 20 Hz, ambient bubbles stop and bursts of particles are halved. Gameplay and
 * the pour animation itself are never reduced.
 *
 * State is a flat number array so it can live in a Reanimated shared value and
 * be stepped on the UI thread:
 * [0] smoothed frame time (ms), [1] tier, [2] ms spent slow, [3] ms spent fast,
 * [4] times it has stepped down, [5] ms since start.
 */
export const QUALITY_FULL = 0;
export const QUALITY_LITE = 1;

/** Ignore the first frames: layout, JIT warm-up and the first draw are always slow. */
export const WARMUP_MS = 2000;
/** Smoothed frame time above this (about 41 fps) counts as slow. */
export const SLOW_MS = 24;
/** Smoothed frame time below this (about 55 fps) counts as healthy. */
export const FAST_MS = 18;
/** Sustained slowness before stepping down, healthy time before stepping back up. */
export const DOWN_AFTER_MS = 2000;
export const UP_AFTER_MS = 15000;
/** After this many step-downs the board stays light, so it cannot flap. */
export const MAX_DOWNGRADES = 2;
/** A longer gap is a stall (backgrounding, a dialog), not a slow frame. */
const STALL_MS = 120;

export const createQualityState = (): number[] => [16.7, QUALITY_FULL, 0, 0, 0, 0];

/** Feed one frame time; returns the current tier. */
export function qualityStep(s: number[], dtMs: number): number {
  'worklet';
  if (dtMs <= 0 || dtMs > STALL_MS) return s[1];
  s[5] += dtMs;
  s[0] = s[0] * 0.9 + dtMs * 0.1;
  if (s[5] < WARMUP_MS) return s[1];
  if (s[1] === QUALITY_FULL) {
    s[2] = s[0] > SLOW_MS ? s[2] + dtMs : 0;
    if (s[2] >= DOWN_AFTER_MS) { s[1] = QUALITY_LITE; s[2] = 0; s[3] = 0; s[4] += 1; }
  } else if (s[4] < MAX_DOWNGRADES) {
    s[3] = s[0] < FAST_MS ? s[3] + dtMs : 0;
    if (s[3] >= UP_AFTER_MS) { s[1] = QUALITY_FULL; s[2] = 0; s[3] = 0; }
  }
  return s[1];
}

/** Idle shimmer period (seconds) for a tier; 0 means every frame. */
export const idlePhasePeriod = (tier: number): number => { 'worklet'; return tier === QUALITY_LITE ? 1 / 20 : 0; };

/** Particles for a burst of `n` at this tier. */
export const burstCount = (n: number, tier: number): number => (tier === QUALITY_LITE ? Math.ceil(n / 2) : n);
