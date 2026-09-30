import { defineLevel } from '../game/levelCodec';
import type { Level } from '../game/types';

// Tubes are written bottom -> top. R = red, G = green, B = blue.
export const HANDCRAFTED_LEVELS: Level[] = [
  // Tutorial (§8.5). Optimal solution, 4 moves:
  //   T1 -> T4   (tap a tube, tap an empty tube: the two red units move)
  //   T2 -> T4   (red only stacks on red: T4 is now a full, sealed tube)
  //   T3 -> T1   (green onto green: T1 is complete)
  //   T3 -> T2   (blue onto blue: every tube is one colour)
  defineLevel({
    id: 'L001',
    number: 1,
    chapter: 1,
    difficulty: 'easy',
    optimalMoves: 4,
    optimalIsExact: true,
    tutorial: 'basics',
    tubes: ['GGRR', 'BBRR', 'BBGG', '', ''],
    meta: { generatorVersion: 'handcrafted', seed: 'handcrafted' },
  }),
];
