import { LEVELS } from '../../src/data/levels';
import { findHint } from '../../src/game/hints';
import { defineLevel } from '../../src/game/levelCodec';
import type { CompactTube } from '../../src/game/levelCodec';
import { hasMechanics, MechSearch } from '../../src/game/mechSolver';
import { isPuzzleSolved } from '../../src/game/rules';
import { applyMove, createInitialState, createSession } from '../../src/game/session';
import { solveLevel, solveState } from '../../src/game/solver';
import type { GameEvent, Level } from '../../src/game/types';

const mk = (tubes: CompactTube[]): Level =>
  defineLevel({ id: 'M', number: 1, chapter: 3, difficulty: 'hard', optimalMoves: 1, optimalIsExact: true, tubes, meta: { generatorVersion: 't', seed: 't' } });

const replay = (level: Level, moves: { from: number; to: number }[]) => {
  let s = createSession(level);
  const events: GameEvent[] = [];
  for (const m of moves) {
    const r = applyMove(s, m);
    expect(r.events.length).toBeGreaterThan(0); // the engine accepted every solver move
    events.push(...r.events);
    s = r.session;
  }
  return { session: s, events };
};

describe('mechanics search agrees with the classic solver', () => {
  it.each([0, 1, 4, 8, 12])('level %i: same optimum', (i) => {
    const level = LEVELS[i];
    expect(hasMechanics(level)).toBe(false);
    const classic = solveLevel(level);
    const search = new MechSearch(level, createInitialState(level), 1, 500_000).run()!;
    expect(search.status).toBe('solved');
    expect(search.solution!.length).toBe(classic.optimal);
  });
});

describe('solving levels with mechanics', () => {
  it('frozen layer: waits for the thaw and the solution replays through the engine', () => {
    const level = mk([{ liquids: 'R^RBB', thawWhen: { type: 'movesMade', count: 2 } }, 'BBRR', '', '']);
    const res = solveLevel(level);
    expect(res).toMatchObject({ solvable: true, exact: true });
    const { session } = replay(level, res.solution!);
    expect(isPuzzleSolved(session.current)).toBe(true);
    expect(session.current.moves).toBe(res.optimal);
  });
  it('a movesMade lock really delays the solution (timing is part of the state)', () => {
    const free = mk(['GGG', 'G', 'RRR', 'R', '']);
    const locked = mk(['GGG', { liquids: 'G', lock: { unlockWhen: { type: 'movesMade', count: 3 } } }, 'RRR', 'R', '']);
    const a = solveLevel(free), b = solveLevel(locked);
    expect(a.optimal).toBe(2);
    expect(b.solvable).toBe(true);
    expect(b.optimal).toBe(4); // two spare moves to reach move 3, then the green pour
    const { session } = replay(locked, b.solution!);
    expect(isPuzzleSolved(session.current)).toBe(true);
  });
  it('a catalyst shortcut is found when it is the cheapest route', () => {
    const level = mk([
      { liquids: '', catalyst: { triggerColor: 'red', effect: { type: 'unlockTube', tubeId: 'T2' } } },
      { liquids: 'BBB', lock: { unlockWhen: { type: 'movesMade', count: 40 } } },
      'RRR', 'RB', '',
    ]);
    const res = solveLevel(level);
    expect(res.solvable).toBe(true);
    const { events } = replay(level, res.solution!);
    expect(events.some((e) => e.type === 'catalystActivated')).toBe(true);
  });
  it('mystery liquid is solved by true colour and replays', () => {
    const level = mk(['R?B?GB', 'G?R?BR', 'BGRG', '', '']);
    const res = solveLevel(level);
    expect(res).toMatchObject({ solvable: true });
    const { session } = replay(level, res.solution!);
    expect(isPuzzleSolved(session.current)).toBe(true);
  });
  it('proves a level unsolvable when a lock can never open', () => {
    const level = mk(['RRRR', { liquids: 'B', lock: { unlockWhen: { type: 'colorCompleted', color: 'blue' } } }, 'BBB']);
    expect(solveLevel(level)).toMatchObject({ solvable: false, exact: true });
  });
  it('needs the level for positions with mechanics', () => {
    const level = mk(['R^R', '']);
    expect(() => solveState(createInitialState(level))).toThrow();
  });
});

describe('hints on mechanics levels', () => {
  it('returns a legal first move that the engine accepts', async () => {
    const level = mk([{ liquids: 'R^RBB', thawWhen: { type: 'movesMade', count: 2 } }, 'BBRR', '', '']);
    const s = createSession(level);
    const h = await findHint(s.current, { level });
    expect(h.kind).toBe('move');
    if (h.kind === 'move') expect(applyMove(s, h.move).events.length).toBeGreaterThan(0);
  });
  it('is unknown without the level', async () => {
    const level = mk([{ liquids: 'R^RBB', thawWhen: { type: 'movesMade', count: 2 } }, '']);
    expect(await findHint(createInitialState(level))).toEqual({ kind: 'unknown' });
  });
});
