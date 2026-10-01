import type { Difficulty, LiquidColor } from './types';
import type { MechSpec, Recipe } from './mechGenerator';
import type { LevelSpec } from './generator';

const C: LiquidColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'cyan', 'pink'];
const colors = (n: number) => C.slice(0, n);

/**
 * The MVP ladder (§10.2). Level 1 is handcrafted and not listed here.
 *
 * Windows of target optimal moves ramp up level by level inside each band so
 * difficulty rises smoothly. The top of the spec's bands (for example 34 for
 * levels 21-25) is not reachable with 2 empty tubes and 4-unit tubes: exact
 * search over thousands of random deals tops out at about 11 / 14 / 18 / 21 / 25
 * moves for 3 / 4 / 5 / 6 / 7 colours. Windows are therefore capped near those
 * maxima. Tune here after playtesting.
 */
const windows: Record<number, [number, number]> = {
  2: [5, 6], 3: [6, 7], 4: [7, 8], 5: [8, 9],
  6: [8, 9], 7: [9, 10], 8: [10, 11], 9: [11, 13], 10: [12, 14],
  11: [12, 13], 12: [13, 14], 13: [14, 15], 14: [15, 16], 15: [16, 18],
  16: [16, 17], 17: [17, 18], 18: [18, 19], 19: [19, 20], 20: [20, 22],
  21: [20, 21], 22: [21, 22], 23: [22, 23], 24: [23, 24], 25: [24, 26],
};

function colourCount(n: number): number {
  if (n <= 5) return 3;
  if (n <= 10) return 4;
  if (n <= 15) return 5;
  if (n <= 20) return 6;
  return 7;
}

export function difficultyFor(n: number): Difficulty {
  if (n <= 8) return 'easy';
  if (n <= 15) return 'medium';
  if (n <= 23) return 'hard';
  return 'expert';
}

export const chapterFor = (n: number) => (n <= 10 ? 1 : 2);

/** Specs for levels 2..25 (generated). */
export const LEVEL_SPECS: LevelSpec[] = Object.keys(windows)
  .map(Number)
  .sort((a, b) => a - b)
  .map((n) => ({
    number: n,
    chapter: chapterFor(n),
    difficulty: difficultyFor(n),
    colors: colors(colourCount(n)),
    empties: 2,
    optMin: windows[n][0],
    optMax: windows[n][1],
  }));

// --- chapters 3-5: mechanics (section 11) ---------------------------------------


const reactor = { slack: 4, bonusCoins: 50 } as const;

type Row = [number, Recipe, [number, number], Difficulty?];

/**
 * Levels 26-55. Chapter 3 Cryogenic Lab (frozen liquid), chapter 4 Unknown
 * Compounds (mystery liquid), chapter 5 Quantum Chemistry (catalysts and locked
 * tubes). Reactor levels are 30, 40 and 50: one per ten levels (section 11.5).
 * Windows are target optimal moves, tuned from exact solves of random deals.
 */
const rows: Row[] = [
  // chapter 3
  [26, { colors: 4, empties: 2, frozen: { tubes: 1, layers: 1, cond: 'moves' } }, [9, 14]],
  [27, { colors: 4, empties: 2, frozen: { tubes: 1, layers: 2, cond: 'moves' } }, [11, 14]],
  [28, { colors: 4, empties: 2, frozen: { tubes: 2, layers: 1, cond: 'tubes' } }, [11, 15]],
  [29, { colors: 5, empties: 2, frozen: { tubes: 1, layers: 2, cond: 'tubes' } }, [13, 17]],
  [30, { colors: 5, empties: 2, frozen: { tubes: 2, layers: 1, cond: 'moves' }, reactor }, [14, 18]],
  [31, { colors: 5, empties: 2, frozen: { tubes: 2, layers: 2, cond: 'color' } }, [14, 18]],
  [32, { colors: 5, empties: 2, frozen: { tubes: 2, layers: 2, cond: 'tubes' } }, [15, 18]],
  [33, { colors: 6, empties: 2, frozen: { tubes: 1, layers: 2, cond: 'moves' } }, [17, 20]],
  [34, { colors: 6, empties: 2, frozen: { tubes: 2, layers: 1, cond: 'tubes' } }, [17, 21]],
  [35, { colors: 6, empties: 2, frozen: { tubes: 2, layers: 2, cond: 'moves' } }, [18, 21]],
  // chapter 4
  [36, { colors: 4, empties: 2, hidden: { tubes: 2 } }, [11, 14]],
  [37, { colors: 4, empties: 2, hidden: { tubes: 3 } }, [12, 14], 'hard'],
  [38, { colors: 4, empties: 2, hidden: { tubes: 'all' } }, [13, 15], 'hard'],
  [39, { colors: 5, empties: 2, hidden: { tubes: 3 } }, [15, 18], 'expert'],
  [40, { colors: 5, empties: 2, hidden: { tubes: 4 }, reactor }, [16, 18], 'expert'],
  [41, { colors: 5, empties: 2, hidden: { tubes: 'all' } }, [17, 19], 'expert'],
  [42, { colors: 6, empties: 2, hidden: { tubes: 3 } }, [18, 21], 'expert'],
  [43, { colors: 6, empties: 2, hidden: { tubes: 4 } }, [19, 21], 'expert'],
  [44, { colors: 6, empties: 2, hidden: { tubes: 'all' } }, [20, 22], 'expert'],
  [45, { colors: 6, empties: 2, hidden: { tubes: 'all' } }, [21, 23], 'expert'],
  // chapter 5
  [46, { colors: 4, empties: 1, locked: { empty: 1, cond: 'moves' } }, [10, 15]],
  [47, { colors: 4, empties: 2, locked: { empty: 1, cond: 'moves' }, catalyst: { effect: 'unlock' } }, [9, 13]],
  [48, { colors: 5, empties: 2, locked: { filled: 1, cond: 'tubes' } }, [14, 17]],
  [49, { colors: 5, empties: 2, frozen: { tubes: 1, layers: 2, cond: 'moves' }, catalyst: { effect: 'thaw' } }, [14, 17]],
  [50, { colors: 5, empties: 2, locked: { filled: 1, cond: 'moves' }, catalyst: { effect: 'unlock' }, reactor }, [15, 18]],
  [51, { colors: 5, empties: 2, hidden: { tubes: 3 }, catalyst: { effect: 'reveal' } }, [15, 18]],
  [52, { colors: 6, empties: 2, locked: { empty: 1, cond: 'moves' }, catalyst: { effect: 'unlock' } }, [17, 21]],
  [53, { colors: 6, empties: 2, frozen: { tubes: 1, layers: 2, cond: 'moves' }, catalyst: { effect: 'thaw' } }, [18, 21]],
  [54, { colors: 6, empties: 1, locked: { empty: 1, filled: 1, cond: 'moves' } }, [17, 21]],
  [55, { colors: 6, empties: 2, hidden: { tubes: 'all' }, catalyst: { effect: 'reveal' } }, [19, 22]],
];

function mechDifficulty(n: number, given?: Difficulty): Difficulty {
  return given ?? (n <= 35 ? 'hard' : n <= 38 ? 'hard' : 'expert');
}

export const mechChapterFor = (n: number) => (n <= 35 ? 3 : n <= 45 ? 4 : 5);

export const MECH_SPECS: MechSpec[] = rows.map(([number, recipe, [optMin, optMax], difficulty]) => ({
  number,
  chapter: mechChapterFor(number),
  difficulty: mechDifficulty(number, difficulty),
  recipe,
  optMin,
  optMax,
}));
