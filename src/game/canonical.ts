import { COLOR_LETTERS } from './levelCodec';
import { ALL_COLORS } from './types';
import type { GameState, Level, LiquidColor, TubeState } from './types';

function tubeToken(t: Pick<TubeState, 'capacity' | 'liquids'>, map?: Record<string, string>): string {
  let s = String.fromCharCode(48 + t.capacity);
  for (const l of t.liquids) {
    const letter = COLOR_LETTERS[l.color];
    s += map ? map[letter] : letter;
  }
  return s;
}

/**
 * Solver state key: tube order is irrelevant, so plain tubes are sorted.
 * (Locked/catalyst/frozen/extra tubes will keep fixed positions in Phase 5.)
 */
export function stateKey(state: GameState): string {
  return state.tubes.map((t) => tubeToken(t)).sort().join(',');
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items.slice()];
  const out: T[][] = [];
  items.forEach((x, i) => {
    const rest = items.slice(0, i).concat(items.slice(i + 1));
    for (const p of permutations(rest)) out.push([x, ...p]);
  });
  return out;
}

/**
 * Key that is equal for levels that differ only by tube order and/or a
 * relabelling of colours (§10.3 duplicate detection). Exact: tries every
 * colour permutation and keeps the smallest sorted-tube key.
 */
export function levelCanonicalKey(level: Pick<Level, 'tubes'>): string {
  const present = ALL_COLORS.filter((c) => level.tubes.some((t) => t.liquids.some((l) => l.color === c)));
  const letters = present.map((c) => COLOR_LETTERS[c as LiquidColor]);
  let best: string | null = null;
  for (const perm of permutations(letters.map((_, i) => i))) {
    const map: Record<string, string> = {};
    letters.forEach((letter, i) => (map[letter] = String.fromCharCode(97 + perm[i])));
    const key = level.tubes.map((t) => tubeToken(t, map)).sort().join(',');
    if (best === null || key < best) best = key;
  }
  return best ?? '';
}
