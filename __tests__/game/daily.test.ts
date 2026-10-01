import { ACHIEVEMENTS } from '../../src/data/achievements';
import { DAILY_POOL } from '../../src/data/daily.pool';
import { LEVELS } from '../../src/data/levels';
import { ECONOMY } from '../../src/config/economy';
import {
  completeDaily, createDailyGenerator, currentStreak, dailyLevelId, dailySeed, dailySpec, DAILY_MAX_ATTEMPTS,
  DAILY_POOL_SIZE, generateDaily, hasCompletedDaily, isDailyId, levelFromPool, poolIndexFor,
} from '../../src/game/daily';
import { levelCanonicalKey } from '../../src/game/canonical';
import { GENERATOR_VERSION } from '../../src/game/generator';
import { tubeToString } from '../../src/game/levelCodec';
import { defaultGameSave } from '../../src/game/save';
import type { GameSave } from '../../src/game/save';
import { verifyLevel } from '../../src/game/verify';
import { addDays, daysBetween, hashString, isDateKey, localDateKey } from '../../src/utils/date';

const done = (save: GameSave, key: string, moves = 20, timeMs = 60_000) =>
  completeDaily(save, key, { moves, timeMs }, LEVELS, 1000, ACHIEVEMENTS);

describe('date helpers', () => {
  it('localDateKey uses local fields and zero-pads', () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(localDateKey(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31');
  });
  it('isDateKey accepts real dates only', () => {
    expect(isDateKey('2026-02-28')).toBe(true);
    expect(isDateKey('2026-02-30')).toBe(false);
    expect(isDateKey('26-02-28')).toBe(false);
    expect(isDateKey(5)).toBe(false);
  });
  it('daysBetween and addDays cross months, years and DST', () => {
    expect(daysBetween('2026-09-30', '2026-10-01')).toBe(1);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetween('2026-10-05', '2026-10-01')).toBe(-4);
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
  it('hashString is stable', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).not.toBe(hashString('abd'));
  });
});

describe('daily puzzle generation', () => {
  it('the seed includes the generator version and the date', () => {
    expect(dailySeed('2026-09-30')).toBe(`chroma-daily-${GENERATOR_VERSION}-2026-09-30`);
    expect(dailyLevelId('2026-09-30')).toBe('daily-2026-09-30');
    expect(isDailyId('daily-2026-09-30')).toBe(true);
    expect(isDailyId('L001')).toBe(false);
  });
  it('the same date gives the same puzzle (two "devices")', () => {
    const a = generateDaily('2026-09-30')!;
    const b = generateDaily('2026-09-30')!;
    expect(a).not.toBeNull();
    expect(a.tubes.map(tubeToString)).toEqual(b.tubes.map(tubeToString));
    expect(a).toEqual(b);
    expect(a.id).toBe('daily-2026-09-30');
    expect(a.number).toBe(0);
  });
  it('different dates give different puzzles, in the medium-hard band with 5-6 colours', () => {
    const keys = Array.from({ length: 8 }, (_, i) => addDays('2026-10-01', i));
    const levels = keys.map((k) => generateDaily(k)!);
    expect(new Set(levels.map((l) => levelCanonicalKey(l))).size).toBe(8);
    for (const l of levels) {
      const colours = new Set(l.tubes.flatMap((t) => t.liquids.map((x) => x.color))).size;
      expect([5, 6]).toContain(colours);
      expect(['medium', 'hard']).toContain(l.difficulty);
      expect(l.optimalIsExact).toBe(true);
      expect(verifyLevel(l)).toEqual([]);
    }
  });
  it('stepping the generator slice by slice reproduces the one-shot result (time slicing cannot change the puzzle)', () => {
    const gen = createDailyGenerator('2026-11-11');
    let level = null;
    while (!level && gen.attempts < DAILY_MAX_ATTEMPTS) {
      const r = gen.tryNext();
      if (r?.level.optimalIsExact) level = r.level;
    }
    expect(level).toEqual(generateDaily('2026-11-11'));
  });
  it('is bounded: a date needs far fewer attempts than the cap', () => {
    const gen = createDailyGenerator('2026-12-25');
    let attempts = 0;
    for (; attempts < DAILY_MAX_ATTEMPTS; attempts++) if (gen.tryNext()) break;
    expect(attempts).toBeLessThan(DAILY_MAX_ATTEMPTS / 2);
  });
  it('the spec depends only on the date', () => {
    expect(dailySpec('2026-09-30')).toEqual(dailySpec('2026-09-30'));
  });
});

describe('fallback pool', () => {
  it('has 60 pre-verified puzzles', () => {
    expect(DAILY_POOL).toHaveLength(DAILY_POOL_SIZE);
    const keys = new Set<string>();
    DAILY_POOL.forEach((_, i) => {
      const level = levelFromPool(DAILY_POOL, `2026-01-${String((i % 28) + 1).padStart(2, '0')}`);
      expect(level.id).toMatch(/^daily-/);
      keys.add(levelCanonicalKey(level));
    });
    for (const e of DAILY_POOL) {
      const l = levelFromPool([e], '2026-05-05');
      expect(verifyLevel(l)).toEqual([]);
    }
    expect(new Set(DAILY_POOL.map((e) => e.tubes.join('|'))).size).toBe(60);
  });
  it('the index is a stable function of the date', () => {
    expect(poolIndexFor('2026-09-30')).toBe(poolIndexFor('2026-09-30'));
    expect(poolIndexFor('2026-09-30')).toBeLessThan(60);
    expect(levelFromPool(DAILY_POOL, '2026-09-30')).toEqual(levelFromPool(DAILY_POOL, '2026-09-30'));
  });
});

describe('daily streaks and rewards', () => {
  it('first completion: +100 coins and a streak of 1 (+10)', () => {
    const { save, result } = done(defaultGameSave(), '2026-10-01');
    expect(result).toMatchObject({ firstCompletion: true, streak: 1, streakBonus: 10, coinsEarned: ECONOMY.dailyCompletion + 10 });
    expect(save.daily).toEqual({ history: { '2026-10-01': { moves: 20, timeMs: 60000 } }, streak: 1, lastDate: '2026-10-01' });
    expect(save.economy.coins).toBe(110);
    expect(save.progress.researchXp).toBe(20);
    expect(hasCompletedDaily(save, '2026-10-01')).toBe(true);
  });
  it('consecutive days build the streak; the bonus is 10 x day capped at 70', () => {
    let s = defaultGameSave();
    const bonuses: number[] = [];
    for (let d = 0; d < 9; d++) { const r = done(s, addDays('2026-10-01', d)); s = r.save; bonuses.push(r.result.streakBonus); }
    expect(bonuses).toEqual([10, 20, 30, 40, 50, 60, 70, 70, 70]);
    expect(s.daily.streak).toBe(9);
  });
  it('a missed day resets the streak to 1', () => {
    let s = done(defaultGameSave(), '2026-10-01').save;
    s = done(s, '2026-10-02').save;
    expect(s.daily.streak).toBe(2);
    const r = done(s, '2026-10-05');
    expect(r.result.streak).toBe(1);
    expect(r.save.daily.lastDate).toBe('2026-10-05');
  });
  it('crosses month and year boundaries', () => {
    let s = done(defaultGameSave(), '2026-12-31').save;
    s = done(s, '2027-01-01').save;
    expect(s.daily.streak).toBe(2);
  });
  it('replaying the same day pays nothing, keeps the streak and only improves bests', () => {
    const first = done(defaultGameSave(), '2026-10-01', 20, 60000).save;
    const r = done(first, '2026-10-01', 18, 70000);
    expect(r.result).toMatchObject({ firstCompletion: false, coinsEarned: 0, streak: 1, bestMoves: 18, bestTimeMs: 60000 });
    expect(r.save.economy.coins).toBe(first.economy.coins);
    expect(r.save.daily.streak).toBe(1);
  });
  it('currentStreak is 0 once a day has been missed', () => {
    const s = done(defaultGameSave(), '2026-10-01').save;
    expect(currentStreak(s, '2026-10-01')).toBe(1);
    expect(currentStreak(s, '2026-10-02')).toBe(1); // today still open
    expect(currentStreak(s, '2026-10-03')).toBe(0);
    expect(currentStreak(defaultGameSave(), '2026-10-03')).toBe(0);
  });
  it('a 7-day streak unlocks Weekly Research once (+150)', () => {
    let s = defaultGameSave();
    const got: string[] = [];
    for (let d = 0; d < 8; d++) {
      const r = done(s, addDays('2026-10-01', d));
      s = r.save;
      got.push(...r.result.achievements.map((a) => a.id));
      if (d === 6) expect(r.result.coinsEarned).toBe(100 + 70 + 150);
    }
    expect(got).toEqual(['weekly_research']);
    expect(s.progress.achievements.weekly_research).toBeDefined();
  });
});
