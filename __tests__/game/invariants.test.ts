import { LEVELS } from '../../src/data/levels';
import { getMeaningfulMoves, isPuzzleSolved } from '../../src/game/rules';
import { addExtraTube, applyMove, createSession, undoMove } from '../../src/game/session';
import { deserializeSession, serializeSession } from '../../src/game/serialize';
import { createRng } from '../../src/utils/seededRandom';
import type { GameState, Session } from '../../src/game/types';

const units = (s: GameState) => s.tubes.reduce((n, t) => n + t.liquids.length, 0);
const perColour = (s: GameState) => {
  const c: Record<string, number> = {};
  for (const t of s.tubes) for (const l of t.liquids) c[l.color] = (c[l.color] ?? 0) + 1;
  return JSON.stringify(Object.entries(c).sort());
};

/**
 * Random playouts over every shipped level. Whatever the player does, volume is
 * conserved (colours too, unless the level mixes), no tube overflows, a hidden
 * layer is never on top, sealed tubes stay complete, the move counter matches
 * the history, and undo and save/load return exactly the same board.
 */
describe('engine invariants on random playouts', () => {
  it.each(LEVELS.map((l) => [l.id, l] as const))('%s', (_id, level) => {
    const rng = createRng(`inv:${level.id}`);
    const mixing = !!level.rules?.mixing;
    let session: Session = createSession(level);
    const start = session.current;
    if (level.number % 2 === 0) session = addExtraTube(session); // cover the extra tube too
    const baseline = session.current;

    for (let step = 0; step < 80 && !isPuzzleSolved(session.current); step++) {
      const moves = getMeaningfulMoves(session.current);
      if (moves.length === 0) break;
      const m = moves[rng.int(moves.length)];
      const before = session.current;
      const r = applyMove(session, m);
      expect(r.events.length).toBeGreaterThan(0);
      session = r.session;
      const s = session.current;

      expect(units(s)).toBe(units(before));
      if (!mixing) expect(perColour(s)).toBe(perColour(before));
      expect(s.moves).toBe(before.moves + 1);
      expect(s.moves).toBe(session.history.length);
      for (const t of s.tubes) {
        expect(t.liquids.length).toBeLessThanOrEqual(t.capacity);
        expect(t.liquids[t.liquids.length - 1]?.hidden).not.toBe(true);
        if (t.sealed) expect(t.liquids.length).toBe(t.capacity);
      }
      if (step % 17 === 0) {
        const again = deserializeSession(serializeSession(session), LEVELS);
        expect(again).not.toBeNull();
        expect(again!.current).toEqual(s);
        expect(again!.current.mix).toEqual(s.mix);
      }
    }

    // undo everything: back to exactly where we started (extra tube included)
    while (session.history.length > 0) session = undoMove(session)!;
    expect(session.current).toEqual(baseline);
    expect(units(session.current)).toBe(units(start) );
  });
});
