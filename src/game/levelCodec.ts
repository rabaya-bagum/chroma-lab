import type { Difficulty, Level, LiquidColor, TubeDef } from './types';
import { DEFAULT_CAPACITY } from './types';

/** One letter per colour; matches the colour labels in §7.4 (V = violet, M = magenta). */
export const COLOR_LETTERS: Record<LiquidColor, string> = {
  red: 'R', blue: 'B', yellow: 'Y', green: 'G',
  purple: 'V', orange: 'O', cyan: 'C', pink: 'M',
};

const LETTER_TO_COLOR: Record<string, LiquidColor> = Object.fromEntries(
  Object.entries(COLOR_LETTERS).map(([color, letter]) => [letter, color as LiquidColor]),
);

/** 'RGB' -> bottom red, green, top blue. '' -> empty tube. */
export function tubeFromString(id: string, row: string, capacity = DEFAULT_CAPACITY): TubeDef {
  const liquids = [...row].map((ch) => {
    const color = LETTER_TO_COLOR[ch];
    if (!color) throw new Error(`Unknown colour letter '${ch}' in tube ${id}`);
    return { color };
  });
  if (liquids.length > capacity) throw new Error(`Tube ${id} exceeds capacity`);
  return { id, capacity, liquids };
}

export function tubeToString(tube: Pick<TubeDef, 'liquids'>): string {
  return tube.liquids.map((l) => COLOR_LETTERS[l.color]).join('');
}

export interface CompactLevel {
  id: string;
  number: number;
  chapter: number;
  difficulty: Difficulty;
  optimalMoves: number;
  optimalIsExact: boolean;
  tutorial?: 'basics';
  tubes: string[];
  meta: { generatorVersion: string; seed: string };
}

export function defineLevel(c: CompactLevel): Level {
  return {
    id: c.id,
    number: c.number,
    chapter: c.chapter,
    difficulty: c.difficulty,
    tubes: c.tubes.map((row, i) => tubeFromString(`T${i + 1}`, row)),
    optimalMoves: c.optimalMoves,
    optimalIsExact: c.optimalIsExact,
    ...(c.tutorial ? { tutorial: c.tutorial } : {}),
    meta: c.meta,
  };
}
