import { makeLevel } from '../helpers';
import { RBY_PAIRS } from '../../src/game/mixing';
import { pourLiquid } from '../../src/game/pour';
import { getMoveError } from '../../src/game/rules';
import { applyMove, createInitialState, createSession, undoMove } from '../../src/game/session';
import { deserializeSession, serializeSession } from '../../src/game/serialize';
import type { Level } from '../../src/game/types';
import { solveLevel } from '../../src/game/solver';

const ALL = [RBY_PAIRS.violet, RBY_PAIRS.green, RBY_PAIRS.orange];

function mixLevel(rows: string[], pairs = ALL): Level {
  const level = makeLevel(rows);
  return { ...level, rules: { mixing: { pairs } } };
}
const colours = (s: ReturnType<typeof createInitialState>, i: number) => s.tubes[i].liquids.map((l) => l.color);

describe('colour mixing', () => {
  it.each([
    ['R', 'B', 'purple'], ['B', 'R', 'purple'],
    ['B', 'Y', 'green'], ['Y', 'B', 'green'],
    ['R', 'Y', 'orange'], ['Y', 'R', 'orange'],
  ])('pouring %s onto %s makes %s', (x, y, result) => {
    const level = mixLevel([`G${x}`, `V${y}`, '']);
    const { state, events } = pourLiquid(level, createInitialState(level), 0, 1);
    expect(colours(state, 0)).toEqual(['green']);
    expect(colours(state, 1)).toEqual(['purple', result, result]);
    expect(events.map((e) => e.type)).toEqual(['poured', 'mixed']);
    expect(events[0]).toMatchObject({ amount: 1 });
  });

  it('pours exactly one unit even from a longer run, and conserves volume', () => {
    const level = mixLevel(['RRR', 'BB', '']);
    const s0 = createInitialState(level);
    const { state } = pourLiquid(level, s0, 0, 1);
    expect(colours(state, 0)).toEqual(['red', 'red']);
    expect(colours(state, 1)).toEqual(['blue', 'purple', 'purple']);
    const total = (s: typeof s0) => s.tubes.reduce((n, t) => n + t.liquids.length, 0);
    expect(total(state)).toBe(total(s0));
    expect(state.moves).toBe(1);
  });

  it('needs room in the destination', () => {
    const level = mixLevel(['R', 'BBBB']);
    expect(getMoveError(createInitialState(level), 0, 1)).toBe('destFull');
  });

  it('leaves cyan, pink and mixed colours inert', () => {
    const level = mixLevel(['C', 'R', 'M', 'RB', 'V']);
    const s = createInitialState(level);
    expect(getMoveError(s, 0, 1)).toBe('colorMismatch');
    expect(getMoveError(s, 2, 1)).toBe('colorMismatch');
    expect(getMoveError(s, 4, 1)).toBe('colorMismatch'); // purple onto red
    expect(getMoveError(s, 1, 4)).toBe('colorMismatch');
  });

  it('only mixes enabled pairs, and never on levels without mixing', () => {
    const only = mixLevel(['R', 'B', 'Y'], [RBY_PAIRS.violet]);
    const s = createInitialState(only);
    expect(getMoveError(s, 0, 1)).toBeNull();
    expect(getMoveError(s, 1, 2)).toBe('colorMismatch');
    expect(getMoveError(createInitialState(makeLevel(['R', 'B'])), 0, 1)).toBe('colorMismatch');
  });

  it('does not mix with a frozen top', () => {
    const level = mixLevel(['R', 'B^']);
    expect(getMoveError(createInitialState(level), 0, 1)).toBe('destFrozenTop');
  });

  it('still pours same-colour as before', () => {
    const level = mixLevel(['RR', 'R', '']);
    const { state } = pourLiquid(level, createInitialState(level), 0, 1);
    expect(colours(state, 1)).toEqual(['red', 'red', 'red']);
  });

  it('a produced colour can trip a catalyst', () => {
    const level = mixLevel(['R', 'B', 'C']);
    level.tubes[1].catalyst = { triggerColor: 'purple', effect: { type: 'revealTube', tubeId: 'T3' } };
    level.tubes[2].liquids = [{ color: 'cyan', hidden: true }, { color: 'cyan' }];
    const { events } = pourLiquid(level, createInitialState(level), 0, 1);
    expect(events.some((e) => e.type === 'catalystActivated')).toBe(true);
  });

  it('undoes a mix and survives a save', () => {
    const level = mixLevel(['RR', 'BB', '']);
    let session = createSession(level);
    session = applyMove(session, { from: 0, to: 1 }).session;
    const restored = deserializeSession(serializeSession(session), [level]);
    expect(restored).not.toBeNull();
    expect(restored!.current.mix).toEqual(ALL);
    expect(colours(restored!.current, 1)).toEqual(['blue', 'purple', 'purple']);
    const back = undoMove(restored!);
    expect(colours(back!.current, 1)).toEqual(['blue', 'blue']);
  });
});

describe('solving mixing levels', () => {
  const { MechSearch, hasMechanics } = jest.requireActual('../../src/game/mechSolver') as typeof import('../../src/game/mechSolver');
  const { solveLevel } = jest.requireActual('../../src/game/solver') as typeof import('../../src/game/solver');
  const { isPuzzleSolved } = jest.requireActual('../../src/game/rules') as typeof import('../../src/game/rules');

  it('a mixing level is solved with a mixing pour, and is unsolvable with mixing off', () => {
    // Two red and two blue cannot fill any tube of four; mixing makes four purple.
    const level = mixLevel(['RR', 'BB', '']);
    expect(hasMechanics(level)).toBe(true);
    const res = solveLevel(level);
    expect(res.solvable).toBe(true);
    expect(res.exact).toBe(true);
    const off = { ...level, rules: undefined } as Level;
    expect(solveLevel(off).solvable).toBe(false);
  });

  it('solutions replay through the engine and the heuristic is admissible', () => {
    // Deterministic pseudo-random small boards.
    let seed = 12345;
    const rnd = (n: number) => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff), seed % n);
    const pool = ['R', 'B', 'Y', 'C'];
    let checked = 0;
    for (let k = 0; k < 40; k++) {
      const letters = Array.from({ length: 8 + rnd(3) }, () => pool[rnd(pool.length)]);
      const rows = ['', '', '', ''];
      letters.forEach((c, i) => { if (rows[i % 3].length < 4) rows[i % 3] += c; });
      const level = mixLevel(rows);
      const start = createInitialState(level);
      const exact = new MechSearch(level, start, 0, 60_000).run()!;   // plain Dijkstra
      const guided = new MechSearch(level, start, 1, 60_000).run()!;
      if (exact.status !== 'solved') continue;
      expect(guided.status).toBe('solved');
      expect(guided.solution!.length).toBe(exact.solution!.length);
      let s = createSession(level);
      for (const m of guided.solution!) s = applyMove(s, m).session;
      expect(isPuzzleSolved(s.current)).toBe(true);
      checked++;
    }
    expect(checked).toBeGreaterThan(5);
  });
});

describe('chapter 6', () => {
  const { LEVELS } = jest.requireActual('../../src/data/levels') as typeof import('../../src/data/levels');
  const { needsMixing } = jest.requireActual('../../src/game/mixGenerator') as typeof import('../../src/game/mixGenerator');
  const { levelCanonicalKey } = jest.requireActual('../../src/game/canonical') as typeof import('../../src/game/canonical');
  const chapter6 = LEVELS.filter((l) => l.chapter === 6);
  const chapter7 = LEVELS.filter((l) => l.chapter === 7);

  it('has levels 56-65, all with mixing rules', () => {
    expect(chapter6.map((l) => l.number)).toEqual([56, 57, 58, 59, 60, 61, 62, 63, 64, 65]);
    expect(chapter6.every((l) => (l.rules?.mixing?.pairs.length ?? 0) > 0)).toBe(true);
    expect(chapter6[0].tutorial).toBe('mixing');
  });

  it('chapter 7 has levels 66-75 and combines mixing with the other mechanics', () => {
    const { hasMechanics: has } = jest.requireActual('../../src/game/mechSolver') as typeof import('../../src/game/mechSolver');
    expect(chapter7.map((l) => l.number)).toEqual([66, 67, 68, 69, 70, 71, 72, 73, 74, 75]);
    expect(chapter7.every((l) => (l.rules?.mixing?.pairs.length ?? 0) > 0 && has(l))).toBe(true);
    const uses = (f: (l: Level) => boolean) => chapter7.some(f);
    expect(uses((l) => l.tubes.some((t) => t.liquids.some((x) => x.frozen)))).toBe(true);
    expect(uses((l) => l.tubes.some((t) => t.liquids.some((x) => x.hidden)))).toBe(true);
    expect(uses((l) => l.tubes.some((t) => t.lock))).toBe(true);
    expect(uses((l) => l.tubes.some((t) => t.catalyst))).toBe(true);
  });

  it.each([...chapter6, ...chapter7].map((l) => [l.id, l] as const))('%s cannot be solved with mixing off', (_id, level) => {
    expect(needsMixing(level)).toBe(true);
    // belt and braces: the real solver agrees on the board with the recipe removed
    const off = { ...level, rules: undefined } as Level;
    expect(solveLevel(off, { maxNodes: 200_000, fallbackNodes: 0 }).solvable).not.toBe(true);
  });

  it('keeps recipe colours distinct in the canonical key', () => {
    const a = mixLevel(['RB', 'BB'], [RBY_PAIRS.violet]);
    const b = mixLevel(['YB', 'BB'], [RBY_PAIRS.green]);
    expect(levelCanonicalKey(a)).not.toBe(levelCanonicalKey(b));
  });

  it('the daily puzzle never mixes', () => {
    const { generateDaily } = jest.requireActual('../../src/game/daily') as typeof import('../../src/game/daily');
    const level = generateDaily('2026-10-01');
    expect(level).not.toBeNull();
    expect(level!.rules?.mixing).toBeUndefined();
    expect(needsMixing(level!)).toBe(false);
  });
});

describe('solver entry points', () => {
  it('refuses to model a mixing state without its level instead of solving it as a classic board', () => {
    const { createSearch } = jest.requireActual('../../src/game/solver') as typeof import('../../src/game/solver');
    const level = mixLevel(['RR', 'BB', '']);
    const state = createInitialState(level);
    expect(createSearch(state, 1, 1000)).toBeNull();
    expect(createSearch(state, 1, 1000, level)).not.toBeNull();
  });
});

describe('chapter 7 catalysts', () => {
  it('every catalyst level has the catalyst in its optimal line', () => {
    const { LEVELS } = jest.requireActual('../../src/data/levels') as typeof import('../../src/data/levels');
    const withCatalyst = LEVELS.filter((l) => l.chapter === 7 && l.tubes.some((t) => t.catalyst));
    expect(withCatalyst.length).toBeGreaterThanOrEqual(4);
    for (const level of withCatalyst) {
      const res = solveLevel(level);
      expect(res.exact).toBe(true);
      let s = createSession(level);
      let fired = false;
      for (const m of res.solution!) {
        const r = applyMove(s, m);
        fired = fired || r.events.some((e) => e.type === 'catalystActivated');
        s = r.session;
      }
      expect(fired).toBe(true);
    }
  });
});

describe('rules panel', () => {
  const { shouldAutoOpenRules, panelRules } = jest.requireActual('../../src/game/mechanicsText') as typeof import('../../src/game/mechanicsText');
  const { LEVELS } = jest.requireActual('../../src/data/levels') as typeof import('../../src/data/levels');
  const level = (n: number) => LEVELS.find((l) => l.number === n)!;

  it('classic levels have no rules to show', () => {
    expect(panelRules(level(10))).toEqual([]);
    expect(shouldAutoOpenRules(level(10), 0, 0)).toBe(false);
  });
  it('opens by itself on the first play of a level with special rules', () => {
    expect(shouldAutoOpenRules(level(75), 0, 0)).toBe(true);
    expect(shouldAutoOpenRules(level(26), 0, 0)).toBe(true);
  });
  it('stays closed after a completion, on a resumed board, and where a tutorial explains the rules', () => {
    expect(shouldAutoOpenRules(level(75), 1, 0)).toBe(false);
    expect(shouldAutoOpenRules(level(75), 0, 3)).toBe(false);
    expect(shouldAutoOpenRules(level(56), 0, 0)).toBe(false); // mixing tutorial
  });
  it('the reactor line is left to the meter', () => {
    expect(panelRules(level(70)).some((l) => l.startsWith('Reactor'))).toBe(false);
  });
});
