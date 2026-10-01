import type { Difficulty, Level, LiquidColor, LiquidLayer, TubeDef } from './types';
import { DEFAULT_CAPACITY } from './types';

/** One letter per colour; matches the colour labels in §7.4 (V = violet, M = magenta). */
export const COLOR_LETTERS: Record<LiquidColor, string> = {
  red: 'R', blue: 'B', yellow: 'Y', green: 'G',
  purple: 'V', orange: 'O', cyan: 'C', pink: 'M',
};

const LETTER_TO_COLOR: Record<string, LiquidColor> = Object.fromEntries(
  Object.entries(COLOR_LETTERS).map(([color, letter]) => [letter, color as LiquidColor]),
);

/**
 * 'RGB' -> bottom red, green, top blue. '' -> empty tube.
 * A letter may be followed by '^' (frozen layer) or '?' (hidden layer): 'R^R?B'.
 */
export function tubeFromString(id: string, row: string, capacity = DEFAULT_CAPACITY): TubeDef {
  const liquids: LiquidLayer[] = [];
  for (let i = 0; i < row.length; i++) {
    const color = LETTER_TO_COLOR[row[i]];
    if (!color) throw new Error(`Unknown colour letter '${row[i]}' in tube ${id}`);
    const mark = row[i + 1];
    if (mark === '^') { liquids.push({ color, frozen: true }); i++; }
    else if (mark === '?') { liquids.push({ color, hidden: true }); i++; }
    else liquids.push({ color });
  }
  if (liquids.length > capacity) throw new Error(`Tube ${id} exceeds capacity`);
  return { id, capacity, liquids };
}

export function tubeToString(tube: Pick<TubeDef, 'liquids'>): string {
  return tube.liquids.map((l) => COLOR_LETTERS[l.color] + (l.frozen ? '^' : l.hidden ? '?' : '')).join('');
}

/** A tube written either as a plain row string or with per-tube rules. */
export type CompactTube = string | (Pick<TubeDef, 'lock' | 'thawWhen' | 'catalyst'> & { liquids: string; capacity?: number });

export interface CompactLevel {
  id: string;
  number: number;
  chapter: number;
  difficulty: Difficulty;
  optimalMoves: number;
  optimalIsExact: boolean;
  tutorial?: Level['tutorial'];
  tubes: CompactTube[];
  rules?: Level['rules'];
  meta: { generatorVersion: string; seed: string };
}

export function defineLevel(c: CompactLevel): Level {
  return {
    id: c.id,
    number: c.number,
    chapter: c.chapter,
    difficulty: c.difficulty,
    tubes: c.tubes.map((t, i) => {
      if (typeof t === 'string') return tubeFromString(`T${i + 1}`, t);
      const { liquids, capacity, ...rules } = t;
      return { ...tubeFromString(`T${i + 1}`, liquids, capacity), ...rules };
    }),
    optimalMoves: c.optimalMoves,
    optimalIsExact: c.optimalIsExact,
    ...(c.tutorial ? { tutorial: c.tutorial } : {}),
    ...(c.rules ? { rules: c.rules } : {}),
    meta: c.meta,
  };
}

/** The compact form of a tube definition (a string when it has no per-tube rules). */
export function toCompactTube(t: TubeDef): CompactTube {
  const { id: _id, capacity, liquids, ...rules } = t;
  if (Object.keys(rules).length === 0 && capacity === DEFAULT_CAPACITY) return tubeToString(t);
  return { liquids: tubeToString(t), ...(capacity !== DEFAULT_CAPACITY ? { capacity } : {}), ...rules };
}
