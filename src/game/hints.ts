import { isPuzzleSolved } from './rules';
import { encodeState, Search } from './solver';
import type { GameState, LiquidColor, Move } from './types';

export type HintResult =
  | { kind: 'move'; move: Move; color: LiquidColor }
  | { kind: 'solved' }
  | { kind: 'unsolvable' }
  | { kind: 'unknown' };

/** Resolves on the next frame. The app uses requestAnimationFrame; tests use a fake. */
export type FrameScheduler = () => Promise<void>;

export interface HintOptions {
  /** Longest uninterrupted stretch of solver work (§10.4: 8 ms per frame). */
  sliceMs?: number;
  /** Budget for the exact search; if it runs out a quick approximate search is tried. */
  totalMs?: number;
  /** Extra time for the approximate fallback. */
  fallbackMs?: number;
  now?: () => number;
  nextFrame?: FrameScheduler;
}

export const HINT_SLICE_MS = 8;
export const HINT_TOTAL_MS = 300;
const HINT_FALLBACK_MS = 100;

const defaultNextFrame: FrameScheduler = () =>
  new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });

/**
 * Find a hint for `state`: the first move of the shortest solution found.
 * The search is cut into slices of at most `sliceMs` with a frame between them,
 * so it never blocks animations (§8.4, §10.4). Resolves `unsolvable` when the
 * exhaustive search proves the position is lost, and `unknown` when time ran out.
 */
export async function findHint(state: GameState, opts: HintOptions = {}): Promise<HintResult> {
  const sliceMs = opts.sliceMs ?? HINT_SLICE_MS;
  const totalMs = opts.totalMs ?? HINT_TOTAL_MS;
  const fallbackMs = opts.fallbackMs ?? HINT_FALLBACK_MS;
  const now = opts.now ?? (() => Date.now());
  const nextFrame = opts.nextFrame ?? defaultNextFrame;

  if (isPuzzleSolved(state)) return { kind: 'solved' };

  let start: string[];
  try {
    start = encodeState(state);
  } catch {
    return { kind: 'unknown' }; // mechanics the solver cannot model yet
  }

  const colorOf = (move: Move): LiquidColor => {
    const tube = state.tubes[move.from];
    return tube.liquids[tube.liquids.length - 1].color;
  };

  const drive = async (search: Search, budgetMs: number) => {
    const began = now();
    for (;;) {
      const sliceStart = now();
      const out = search.run(() => now() - sliceStart >= sliceMs);
      if (out) return out;
      if (now() - began >= budgetMs) return null;
      await nextFrame();
    }
  };

  const exact = await drive(new Search(start, 1, 2_000_000), totalMs);
  if (exact?.status === 'solved') {
    const move = exact.solution![0];
    return { kind: 'move', move, color: colorOf(move) };
  }
  if (exact?.status === 'exhausted') return { kind: 'unsolvable' };

  // Out of time (or node budget): look for any solution quickly.
  const approx = await drive(new Search(start, 3, 200_000), fallbackMs);
  if (approx?.status === 'solved') {
    const move = approx.solution![0];
    return { kind: 'move', move, color: colorOf(move) };
  }
  if (approx?.status === 'exhausted') return { kind: 'unsolvable' };
  return { kind: 'unknown' };
}
