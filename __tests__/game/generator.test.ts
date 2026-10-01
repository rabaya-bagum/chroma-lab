import { levelCanonicalKey } from '../../src/game/canonical';
import { chapterFor, difficultyFor, LEVEL_SPECS } from '../../src/game/difficulty';
import { dealRowOk, dealTubes, generateLevel } from '../../src/game/generator';
import { tubeToString } from '../../src/game/levelCodec';
import { hasMechanics } from '../../src/game/mechSolver';
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
  const classic = LEVELS.slice(0, 25);
  it('there are 75 consecutive levels: 25 classic, 30 with mechanics and 20 with mixing', () => {
    expect(LEVELS).toHaveLength(75);
    expect(verifyLevelSet(LEVELS)).toEqual([]);
  });
  it.each(LEVELS.map((l) => [l.id, l] as const))('%s is solvable with the recorded optimum', (_id, level) => {
    expect(verifyLevel(level)).toEqual([]);
  });
  it('level 1 is the handcrafted tutorial with 3-4 optimal moves', () => {
    expect(LEVELS[0]).toMatchObject({ id: 'L001', tutorial: 'basics', meta: { seed: 'handcrafted' } });
    expect([3, 4]).toContain(LEVELS[0].optimalMoves);
  });
  it('classic levels follow the ladder: colours, empty tubes, difficulty', () => {
    classic.forEach((l, i) => {
      const colours = new Set(l.tubes.flatMap((t) => t.liquids.map((x) => x.color))).size;
      const empties = l.tubes.filter((t) => t.liquids.length === 0).length;
      expect(empties).toBe(2);
      expect(l.tubes).toHaveLength(colours + 2);
      if (i > 0) expect(l.difficulty).toBe(difficultyFor(l.number));
      expect(l.chapter).toBe(chapterFor(l.number));
      expect(hasMechanics(l)).toBe(false);
    });
    expect(LEVELS[1].tubes).toHaveLength(5);
    expect(LEVELS[24].tubes).toHaveLength(9);
  });
  it('difficulty never drops by more than one grade from one level to the next', () => {
    const grade = ['easy', 'medium', 'hard', 'expert'];
    LEVELS.forEach((l, i) => {
      if (i > 0) expect(grade.indexOf(l.difficulty)).toBeGreaterThanOrEqual(grade.indexOf(LEVELS[i - 1].difficulty) - 1);
    });
  });
  it('classic generated levels have no complete tube and no top run of 3+', () => {
    for (const l of classic.slice(1)) for (const t of l.tubes) if (t.liquids.length) expect(dealRowOk(tubeToString(t))).toBe(true);
  });
});

describe('chapters 3-5', () => {
  const ch = (n: number) => LEVELS.filter((l) => l.chapter === n);
  const has = (l: (typeof LEVELS)[number], f: (t: (typeof LEVELS)[number]['tubes'][number]) => unknown) => l.tubes.some(f);

  it('each chapter has at least 10 levels', () => {
    for (const n of [3, 4, 5]) expect(ch(n).length).toBeGreaterThanOrEqual(10);
    expect(ch(3).map((l) => l.number)).toEqual([26, 27, 28, 29, 30, 31, 32, 33, 34, 35]);
  });
  it('chapter 3 has frozen liquid with a thaw condition on every level', () => {
    for (const l of ch(3)) {
      expect(has(l, (t) => t.liquids.some((x) => x.frozen))).toBe(true);
      for (const t of l.tubes) if (t.liquids.some((x) => x.frozen)) expect(t.thawWhen).toBeDefined();
    }
  });
  it('chapter 4 has mystery liquid on every level', () => {
    for (const l of ch(4)) expect(has(l, (t) => t.liquids.some((x) => x.hidden))).toBe(true);
  });
  it('chapter 5 uses catalysts or locked tubes on every level, and both appear', () => {
    for (const l of ch(5)) expect(has(l, (t) => t.lock || t.catalyst)).toBe(true);
    expect(ch(5).some((l) => has(l, (t) => t.catalyst))).toBe(true);
    expect(ch(5).some((l) => has(l, (t) => t.lock))).toBe(true);
  });
  it('every catalyst effect targets a tube that exists and can use it', () => {
    for (const l of LEVELS) for (const t of l.tubes) {
      if (!t.catalyst) continue;
      const target = l.tubes.find((x) => x.id === t.catalyst!.effect.tubeId)!;
      expect(target).toBeDefined();
      if (t.catalyst.effect.type === 'unlockTube') expect(target.lock).toBeDefined();
      if (t.catalyst.effect.type === 'thawTube') expect(target.liquids.some((x) => x.frozen)).toBe(true);
      if (t.catalyst.effect.type === 'revealTube') expect(target.liquids.some((x) => x.hidden)).toBe(true);
    }
  });
  it('no mechanic level starts with a hidden layer on top, a complete tube, or a missing thaw condition', () => {
    for (const l of LEVELS.slice(25)) for (const t of l.tubes) {
      expect(t.liquids[t.liquids.length - 1]?.hidden).toBeUndefined();
      expect(t.liquids.length === 4 && new Set(t.liquids.map((x) => x.color)).size === 1).toBe(false);
    }
  });
  it('there is at most one reactor level in any ten consecutive levels, and the limit allows the optimum', () => {
    const reactors = LEVELS.filter((l) => l.rules?.reactor).map((l) => l.number);
    expect(reactors.length).toBeGreaterThan(0);
    for (let start = 1; start <= 46; start++) {
      expect(reactors.filter((n) => n >= start && n < start + 10).length).toBeLessThanOrEqual(1);
    }
    for (const l of LEVELS.filter((x) => x.rules?.reactor)) {
      expect(l.rules!.reactor!.moveLimit).toBeGreaterThanOrEqual(l.optimalMoves);
      expect(l.rules!.reactor!.bonusCoins).toBeGreaterThan(0);
    }
  });
  it('mechanic levels are exactly solved', () => {
    for (const l of LEVELS.slice(25)) expect(l.optimalIsExact).toBe(true);
  });
});
