import { hintCost, extraTubeCost } from '../../src/config/economy';
import { findHint } from '../../src/game/hints';
import { isPuzzleSolved, isValidMove } from '../../src/game/rules';
import { applyMove, createSession } from '../../src/game/session';
import { solveLevel } from '../../src/game/solver';
import { LEVELS } from '../../src/data/levels';
import { stateOf } from '../helpers';

describe('findHint', () => {
  it('returns a legal first move on the way to a solution, naming the colour', async () => {
    const level = LEVELS[0];
    const hint = await findHint(createSession(level).current);
    expect(hint.kind).toBe('move');
    if (hint.kind !== 'move') return;
    expect(isValidMove(createSession(level).current, hint.move.from, hint.move.to)).toBe(true);
    expect(solveLevel(level).solution![0]).toEqual(hint.move);
    expect(['red', 'green', 'blue']).toContain(hint.color);
  });
  it('following hints repeatedly solves a mid-size level', async () => {
    let s = createSession(LEVELS[8]);
    for (let i = 0; i < 40 && !(await isDone(s)); i++) {
      const h = await findHint(s.current);
      if (h.kind !== 'move') break;
      s = applyMove(s, h.move).session;
    }
    expect(await isDone(s)).toBe(true);
    expect(s.current.moves).toBe(LEVELS[8].optimalMoves); // hints follow an optimal line
  });
  it('reports solved boards and unsolvable mixtures', async () => {
    expect(await findHint(stateOf(['RRRR', 'BBBB', '']))).toEqual({ kind: 'solved' });
    expect(await findHint(stateOf(['RBRB', 'BRBR', 'GGGG']))).toEqual({ kind: 'unsolvable' });
  });
  it('is unknown for mechanics it cannot model', async () => {
    const s = stateOf(['RR', '']);
    const locked = { ...s, tubes: s.tubes.map((t, i) => (i === 0 ? { ...t, locked: true } : t)) };
    expect(await findHint(locked)).toEqual({ kind: 'unknown' });
  });

  describe('never blocks: work is cut into slices with a frame between', () => {
    // virtual clock: each node expansion is not timed, so advance time per `now()` call
    const harness = () => {
      let t = 0;
      let frames = 0;
      return {
        now: () => (t += 0.5),            // every clock read costs 0.5 ms
        nextFrame: async () => { frames++; t += 16; },
        frames: () => frames,
      };
    };
    it('yields to the next frame many times on a hard position', async () => {
      const level = LEVELS[24];
      const h = harness();
      const res = await findHint(createSession(level).current, { ...h, sliceMs: 2, totalMs: 100_000 });
      expect(res.kind).toBe('move');
      expect(h.frames()).toBeGreaterThan(3);
    });
    it('gives up with unknown (never hangs) when the time budget is tiny', async () => {
      const h = harness();
      const res = await findHint(createSession(LEVELS[24]).current, { ...h, sliceMs: 1, totalMs: 1, fallbackMs: 1 });
      expect(['unknown', 'move']).toContain(res.kind);
    });
  });
});

const isDone = async (s: ReturnType<typeof createSession>) => isPuzzleSolved(s.current);

describe('hint and extra tube pricing', () => {
  it('hints are free on levels 1-10; after that one free then 50 coins', () => {
    expect(hintCost(5, 0)).toBe(0);
    expect(hintCost(10, 7)).toBe(0);
    expect(hintCost(11, 0)).toBe(0);
    expect(hintCost(11, 1)).toBe(50);
    expect(hintCost(25, 3)).toBe(50);
  });
  it('the daily puzzle (level 0) uses paid rates', () => {
    expect(hintCost(0, 1)).toBe(50);
    expect(extraTubeCost(0)).toBe(100);
    expect(extraTubeCost(10)).toBe(0);
  });
});

