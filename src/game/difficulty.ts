import type { Difficulty, LiquidColor } from './types';
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
