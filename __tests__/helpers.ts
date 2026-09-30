import { tubeFromString } from '../src/game/levelCodec';
import { createInitialState, createSession } from '../src/game/session';
import type { Level } from '../src/game/types';

/** Build a level from rows like ['RGB', 'BG', '']. */
export function makeLevel(rows: string[], optimalMoves = 1, id = 'T'): Level {
  return {
    id, number: 1, chapter: 1, difficulty: 'easy',
    tubes: rows.map((r, i) => tubeFromString(`T${i + 1}`, r)),
    optimalMoves, optimalIsExact: true,
    meta: { generatorVersion: 'test', seed: 'test' },
  };
}
export const stateOf = (rows: string[]) => createInitialState(makeLevel(rows));
export const sessionOf = (rows: string[], optimalMoves = 1) => createSession(makeLevel(rows, optimalMoves));
