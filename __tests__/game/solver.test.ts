import { levelCanonicalKey, stateKey } from '../../src/game/canonical';
import { solveLevel, solveState } from '../../src/game/solver';
import { applyMove, createSession } from '../../src/game/session';
import { isPuzzleSolved } from '../../src/game/rules';
import { makeLevel, stateOf } from '../helpers';

describe('solver', () => {
  it('finds known optimal lengths', () => {
    expect(solveLevel(makeLevel(['GGRR', 'BBRR', 'BBGG', '', ''])).optimal).toBe(4);
    expect(solveLevel(makeLevel(['BR', 'RRR', 'BBB'])).optimal).toBe(2);
    expect(solveLevel(makeLevel(['RRRR', 'BBBB', ''])).optimal).toBe(0);
  });
  it('returns an exact result with a solution that solves the level', () => {
    const level = makeLevel(['RGBR', 'GBRG', 'BRGB', '', '']);
    const res = solveLevel(level);
    expect(res).toMatchObject({ solvable: true, exact: true });
    let s = createSession(level);
    for (const m of res.solution!) s = applyMove(s, m).session;
    expect(isPuzzleSolved(s.current)).toBe(true);
    expect(s.current.moves).toBe(res.optimal);
  });
  it('detects unsolvable fixtures', () => {
    expect(solveLevel(makeLevel(['RBRB', 'BRBR', 'GGGG']))).toMatchObject({ solvable: false, exact: true });
    // one empty tube cannot break up a full mixed pair that needs two spare tubes
    expect(solveLevel(makeLevel(['RRBB', 'BBRR']))).toMatchObject({ solvable: false });
  });
  it('reports a non-exact result or unknown when the budget is tiny', () => {
    const level = makeLevel(['RGBYR', 'GBYRG', 'BYRGB', 'YRGBY', '', ''].map((r) => r.slice(0, 4)));
    const res = solveLevel(level, { maxNodes: 5, fallbackNodes: 5 });
    expect(res.exact).toBe(false);
    expect(res.solvable).toBe('unknown');
  });
  it('falls back to a valid, non-exact solution when only the exact pass runs out', () => {
    const level = makeLevel(['RGBY', 'GBYR', 'BYRG', 'YRGB', '', '']);
    const res = solveLevel(level, { maxNodes: 20, fallbackNodes: 100_000 });
    expect(res.solvable).toBe(true);
    expect(res.exact).toBe(false);
    let s = createSession(level);
    for (const m of res.solution!) s = applyMove(s, m).session;
    expect(isPuzzleSolved(s.current)).toBe(true);
  });
  it('refuses mechanics it cannot model yet', () => {
    const s = stateOf(['RR', '']);
    const locked = { ...s, tubes: s.tubes.map((t, i) => (i === 0 ? { ...t, locked: true } : t)) };
    expect(() => solveState(locked)).toThrow();
  });
});

describe('canonical keys', () => {
  it('stateKey ignores tube order', () => {
    expect(stateKey(stateOf(['RB', 'GG', '']))).toBe(stateKey(stateOf(['', 'GG', 'RB'])));
    expect(stateKey(stateOf(['RB', 'GG']))).not.toBe(stateKey(stateOf(['BR', 'GG'])));
  });
  it('levelCanonicalKey ignores tube order and colour relabelling', () => {
    const a = makeLevel(['RRGG', 'GGRR', '', '']);
    const b = makeLevel(['', 'BBYY', '', 'YYBB']);
    expect(levelCanonicalKey(a)).toBe(levelCanonicalKey(b));
    expect(levelCanonicalKey(makeLevel(['RGRG', 'GRGR', '', '']))).not.toBe(levelCanonicalKey(a));
  });
});
