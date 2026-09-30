import { levelCanonicalKey } from '../../src/game/canonical';
import { chapterFor, difficultyFor, LEVEL_SPECS } from '../../src/game/difficulty';
import { dealRowOk, dealTubes, generateLevel } from '../../src/game/generator';
import { tubeToString } from '../../src/game/levelCodec';
import { verifyLevel, verifyLevelSet } from '../../src/game/verify';
import { LEVELS } from '../../src/data/levels';
import { createRng } from '../../src/utils/seededRandom';

const spec = LEVEL_SPECS.find((s) => s.number === 8)!;

describe('dealing', () => {
  it('dealRowOk enforces the constraints', () => {
    expect(dealRowOk('RRRR')).toBe(false);
    expect(dealRowOk('BRRR')).toBe(false); // top run of 3
    expect(dealRowOk('RRRB')).toBe(true);  // run of 3 is at the bottom, top is one B
    expect(dealRowOk('RBRR')).toBe(true);
    expect(dealRowOk('RBB')).toBe(false);  // wrong length
  });
  it('every dealt tube satisfies them and all colours have 4 units', () => {
    const rng = createRng('deal');
    for (let i = 0; i < 200; i++) {
      const rows = dealTubes(rng, spec.colors, 2);
      expect(rows).toHaveLength(spec.colors.length + 2);
      const filled = rows.filter((r) => r);
      expect(filled.every((r) => dealRowOk(r))).toBe(true);
      const all = filled.join('');
      for (const c of new Set(all)) expect(all.split(c).length - 1).toBe(4);
    }
  });
});

describe('generateLevel', () => {
  it('is deterministic', () => {
    const a = generateLevel(spec, 'seed-1')!;
    const b = generateLevel(spec, 'seed-1')!;
    expect(a.level).toEqual(b.level);
    expect(a.metrics).toEqual(b.metrics);
  });
  it('differs for different seeds', () => {
    const a = generateLevel(spec, 'seed-1')!;
    const b = generateLevel(spec, 'seed-2')!;
    expect(a.level.tubes.map(tubeToString)).not.toEqual(b.level.tubes.map(tubeToString));
  });
  it('produces a solvable level inside the requested window', () => {
    const { level } = generateLevel(spec, 'seed-3')!;
    expect(level.optimalMoves).toBeGreaterThanOrEqual(spec.optMin);
    expect(level.optimalMoves).toBeLessThanOrEqual(spec.optMax);
    expect(verifyLevel(level)).toEqual([]);
  });
  it('rejects duplicates via the seen set', () => {
    const seen = new Set<string>();
    const a = generateLevel(spec, 'dup', { seen })!;
    expect(seen.has(levelCanonicalKey(a.level))).toBe(true);
    const b = generateLevel(spec, 'dup', { seen })!; // same stream: must skip the first deal
    expect(levelCanonicalKey(b.level)).not.toBe(levelCanonicalKey(a.level));
    expect(b.attempts).toBeGreaterThan(1);
  });
  it('returns null when the window cannot be met', () => {
    expect(generateLevel({ ...spec, optMin: 99, optMax: 100 }, 'x', { maxAttempts: 20 })).toBeNull();
  });
});

describe('shipped levels', () => {
  it('there are 25 consecutive levels', () => {
    expect(LEVELS).toHaveLength(25);
    expect(verifyLevelSet(LEVELS)).toEqual([]);
  });
  it.each(LEVELS.map((l) => [l.id, l] as const))('%s is solvable with the recorded optimum', (_id, level) => {
    expect(verifyLevel(level)).toEqual([]);
  });
  it('level 1 is the handcrafted tutorial with 3-4 optimal moves', () => {
    expect(LEVELS[0]).toMatchObject({ id: 'L001', tutorial: 'basics', meta: { seed: 'handcrafted' } });
    expect([3, 4]).toContain(LEVELS[0].optimalMoves);
  });
  it('follows the ladder: colours, empty tubes, difficulty never drops more than one grade', () => {
    const grade = ['easy', 'medium', 'hard', 'expert'];
    LEVELS.forEach((l, i) => {
      const colours = new Set(l.tubes.flatMap((t) => t.liquids.map((x) => x.color))).size;
      const empties = l.tubes.filter((t) => t.liquids.length === 0).length;
      expect(empties).toBe(2);
      expect(l.tubes).toHaveLength(colours + 2);
      if (i > 0) expect(grade.indexOf(l.difficulty)).toBeGreaterThanOrEqual(grade.indexOf(LEVELS[i - 1].difficulty) - 1);
      if (i > 0) expect(l.difficulty).toBe(difficultyFor(l.number));
      expect(l.chapter).toBe(chapterFor(l.number));
    });
    expect(LEVELS[1].tubes).toHaveLength(5);
    expect(LEVELS[24].tubes).toHaveLength(9);
  });
  it('generated levels have no complete tube and no top run of 3+', () => {
    for (const l of LEVELS.slice(1)) for (const t of l.tubes) if (t.liquids.length) expect(dealRowOk(tubeToString(t))).toBe(true);
  });
});
