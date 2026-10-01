import type { GameState, LiquidColor, MixPair } from './types';

/** The red-blue-yellow table (§11.6). Cyan, pink and mixed colours are inert. */
export const RBY_PAIRS: Record<'violet' | 'green' | 'orange', MixPair> = {
  violet: { a: 'red', b: 'blue', result: 'purple' },
  green: { a: 'blue', b: 'yellow', result: 'green' },
  orange: { a: 'red', b: 'yellow', result: 'orange' },
};

/** The colour made by pouring `x` onto `y` (either order), or null if that pair is not enabled. */
export function mixResult(
  pairs: readonly MixPair[] | undefined,
  x: LiquidColor,
  y: LiquidColor,
): LiquidColor | null {
  if (!pairs || x === y) return null;
  for (const p of pairs) {
    if ((p.a === x && p.b === y) || (p.a === y && p.b === x)) return p.result;
  }
  return null;
}

/**
 * True when the pour from `from` to `to` is a legal mixing pour: both tops are
 * different colours that form an enabled pair, and the destination has room for
 * the extra unit the mix creates (the poured unit and the top unit become two).
 * Exactly one unit leaves the source, so volume is conserved.
 */
export function isMixPour(state: GameState, from: number, to: number): boolean {
  if (!state.mix || from === to) return false;
  const a = state.tubes[from];
  const b = state.tubes[to];
  if (!a || !b || a.liquids.length === 0 || b.liquids.length === 0) return false;
  if (a.locked || a.sealed || b.locked) return false;
  const aTop = a.liquids[a.liquids.length - 1];
  const bTop = b.liquids[b.liquids.length - 1];
  if (aTop.frozen || bTop.frozen) return false;
  return mixResult(state.mix, aTop.color, bTop.color) !== null;
}
