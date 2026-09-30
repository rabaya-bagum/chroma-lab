/**
 * Pooled particle system (§16: at most 120 live particles). State is one flat
 * array so it can live in a Reanimated shared value and be stepped on the UI
 * thread. Layout: [liveCount, then MAX slots of STRIDE numbers each].
 * Slot: x, y, vx, vy, life, maxLife, size, kind.
 */
export const MAX_PARTICLES = 120;
export const STRIDE = 8;
export const KIND_BUBBLE = 0;
export const KIND_SPARK = 1;

export const createParticleState = (): number[] => new Array(1 + MAX_PARTICLES * STRIDE).fill(0);

export interface Emit {
  x: number; y: number; vx: number; vy: number;
  life: number; size: number; kind: number;
}

/** Add a particle in the first free slot. Returns false if the pool is full. */
export function emit(a: number[], e: Emit): boolean {
  'worklet';
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const o = 1 + i * STRIDE;
    if (a[o + 4] <= 0) {
      a[o] = e.x; a[o + 1] = e.y; a[o + 2] = e.vx; a[o + 3] = e.vy;
      a[o + 4] = e.life; a[o + 5] = e.life; a[o + 6] = e.size; a[o + 7] = e.kind;
      a[0] += 1;
      return true;
    }
  }
  return false;
}

/** Advance all live particles by dt seconds. */
export function step(a: number[], dt: number): void {
  'worklet';
  let live = 0;
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const o = 1 + i * STRIDE;
    if (a[o + 4] <= 0) continue;
    a[o + 4] -= dt;
    if (a[o + 4] <= 0) { a[o + 4] = 0; continue; }
    if (a[o + 7] === KIND_SPARK) a[o + 3] += 420 * dt; // gravity
    a[o] += a[o + 2] * dt;
    a[o + 1] += a[o + 3] * dt;
    if (a[o + 7] === KIND_BUBBLE) a[o] += Math.sin(a[o + 4] * 9 + i) * 6 * dt; // sway
    live++;
  }
  a[0] = live;
}

/** Live particles of one kind with their fade factor (life / maxLife). */
export function liveOfKind(a: number[], kind: number): { x: number; y: number; r: number; fade: number }[] {
  'worklet';
  const out: { x: number; y: number; r: number; fade: number }[] = [];
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const o = 1 + i * STRIDE;
    if (a[o + 4] > 0 && a[o + 7] === kind) {
      const fade = a[o + 4] / a[o + 5];
      out.push({ x: a[o], y: a[o + 1], r: a[o + 6] * (kind === KIND_SPARK ? 0.4 + 0.6 * fade : 1), fade });
    }
  }
  return out;
}
