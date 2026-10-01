import { ACHIEVEMENT_LIST, evaluateAchievements } from '../../src/data/achievements';
import { LEVELS } from '../../src/data/levels';
import { ECONOMY, extraTubeCost, labLevelFor, streakBonus, xpForLevel } from '../../src/config/economy';
import { completeLevel, continueTarget, isLevelCompleted, isLevelUnlocked, spendCoins } from '../../src/game/progress';
import { defaultGameSave, recomputeDerived } from '../../src/game/save';
import type { GameSave } from '../../src/game/save';
import type { Level } from '../../src/game/types';

const level = (n: number) => LEVELS[n - 1];
const run = (moves: number, o: Partial<{ undosUsed: number; hintsUsed: number; extraTubeUsed: boolean }> = {}) =>
  ({ moves, undosUsed: 0, hintsUsed: 0, extraTubeUsed: false, ...o });
const complete = (save: GameSave, l: Level, moves: number, o = {}) => completeLevel(save, l, run(moves, o), LEVELS, 1000);

describe('economy config', () => {
  it('extra tube is free on levels 1-10 and costs 100 after', () => {
    expect(extraTubeCost(1)).toBe(0);
    expect(extraTubeCost(10)).toBe(0);
    expect(extraTubeCost(11)).toBe(100);
  });
  it('streak bonus is 10 x day, capped at 70', () => {
    expect([1, 3, 7, 8, 30].map(streakBonus)).toEqual([10, 30, 70, 70, 70]);
    expect(streakBonus(0)).toBe(0);
  });
  it('lab level curve', () => {
    expect(labLevelFor(0).level).toBe(1);
    expect(labLevelFor(xpForLevel(2) - 1).level).toBe(1);
    expect(labLevelFor(xpForLevel(2)).level).toBe(2);
    expect(labLevelFor(xpForLevel(4)).level).toBe(4);
    const l = labLevelFor(xpForLevel(2) + 10);
    expect(l.xpIntoLevel).toBe(10);
    expect(l.xpForNext).toBe(xpForLevel(3) - xpForLevel(2));
  });
});

describe('completeLevel rewards', () => {
  const l1 = level(1);
  it('first completion with 3 stars: +50 +25 plus First Reaction and Perfect Formula', () => {
    const { save, result } = complete(defaultGameSave(), l1, l1.optimalMoves);
    expect(result).toMatchObject({ stars: 3, firstCompletion: true, firstThreeStars: true, levelCoins: 75 });
    expect(result.achievements.map((a) => a.id).sort()).toEqual(['efficiency_expert', 'first_reaction', 'perfect_formula']);
    expect(result.coinsEarned).toBe(75 + 25 + 50 + 100);
    expect(save.economy.coins).toBe(result.coinsEarned);
    expect(save.progress.levels.L001).toEqual({ stars: 3, bestMoves: 4, completions: 1 });
    expect(save.progress.tutorialDone).toBe(true);
  });
  it('first completion with 1 star gives only +50', () => {
    const { result } = complete(defaultGameSave(), l1, l1.optimalMoves + 20);
    expect(result).toMatchObject({ stars: 1, levelCoins: 50, firstThreeStars: false });
  });
  it('replays give +5, and +25 once when 3 stars are reached for the first time', () => {
    let s = complete(defaultGameSave(), l1, l1.optimalMoves + 5).save; // 2 stars
    let r = complete(s, l1, l1.optimalMoves + 5);
    expect(r.result.levelCoins).toBe(5);
    s = r.save;
    r = complete(s, l1, l1.optimalMoves);
    expect(r.result).toMatchObject({ levelCoins: 30, firstThreeStars: true, isNewBest: true, stars: 3 });
    r = complete(r.save, l1, l1.optimalMoves);
    expect(r.result.levelCoins).toBe(5);
    expect(r.result.isNewBest).toBe(false);
  });
  it('keeps the best stars and best moves when a replay is worse', () => {
    let s = complete(defaultGameSave(), l1, l1.optimalMoves).save;
    s = complete(s, l1, l1.optimalMoves + 20).save;
    expect(s.progress.levels.L001).toMatchObject({ stars: 3, bestMoves: 4, completions: 2 });
  });
  it('the extra tube caps stars at 2', () => {
    const { result } = complete(defaultGameSave(), l1, l1.optimalMoves, { extraTubeUsed: true });
    expect(result.stars).toBe(2);
    expect(result.firstThreeStars).toBe(false);
  });
  it('completing level N unlocks level N+1 and updates derived values', () => {
    const base = defaultGameSave();
    expect(isLevelUnlocked(base, level(1))).toBe(true);
    expect(isLevelUnlocked(base, level(2))).toBe(false);
    const { save } = complete(base, l1, 4);
    expect(isLevelUnlocked(save, level(2))).toBe(true);
    expect(isLevelUnlocked(save, level(3))).toBe(false);
    expect(isLevelCompleted(save, 'L001')).toBe(true);
    expect(save.progress).toMatchObject({ starsTotal: 3, researchXp: 30, highestUnlocked: 2 });
    expect(save.progress.stats.levelsCompleted).toBe(1);
  });
  it('highestUnlocked never exceeds the last level', () => {
    let s = defaultGameSave();
    for (const l of LEVELS) s = complete(s, l, l.optimalMoves).save;
    expect(s.progress.highestUnlocked).toBe(LEVELS.length);
    expect(s.progress.stats.levelsCompleted).toBe(LEVELS.length);
    expect(s.progress.starsTotal).toBe(LEVELS.length * 3);
  });
  it('tracks undos', () => {
    const { save } = complete(defaultGameSave(), l1, 6, { undosUsed: 2 });
    expect(save.progress.stats.undos).toBe(2);
  });
});

describe('achievements', () => {
  it('has the eight spec achievements with spec rewards', () => {
    expect(Object.fromEntries(ACHIEVEMENT_LIST.map((a) => [a.id, a.reward]))).toEqual({
      first_reaction: 25, perfect_formula: 50, researcher: 75, scientist: 200,
      no_mistakes: 50, efficiency_expert: 100, weekly_research: 150, master_chemist: 150,
    });
  });
  it('no_mistakes needs level 6+ and zero undos', () => {
    const l6 = level(6), l5 = level(5);
    const s0 = defaultGameSave();
    expect(complete(s0, l5, l5.optimalMoves + 9).result.achievements.map((a) => a.id)).not.toContain('no_mistakes');
    expect(complete(s0, l6, l6.optimalMoves + 9, { undosUsed: 1 }).result.achievements.map((a) => a.id)).not.toContain('no_mistakes');
    expect(complete(s0, l6, l6.optimalMoves + 9).result.achievements.map((a) => a.id)).toContain('no_mistakes');
  });
  it('researcher at 10 completed levels, awarded once', () => {
    let s = defaultGameSave();
    const got: string[] = [];
    for (const l of LEVELS.slice(0, 11)) {
      const r = complete(s, l, l.optimalMoves + 9);
      s = r.save;
      got.push(...r.result.achievements.map((a) => a.id));
    }
    expect(got.filter((id) => id === 'researcher')).toHaveLength(1);
    expect(s.progress.achievements.researcher).toBeDefined();
  });
  it('efficiency_expert needs an exact optimum', () => {
    const l = { ...level(2), optimalIsExact: false };
    expect(evaluateAchievements(recomputeDerived(defaultGameSave(), LEVELS), { level: l, moves: l.optimalMoves, undosUsed: 0, stars: 3 })).not.toContain('efficiency_expert');
  });
  it('master_chemist for an expert level, weekly_research for a 7-day streak', () => {
    const expert = LEVELS.find((l) => l.difficulty === 'expert')!;
    expect(complete(defaultGameSave(), expert, expert.optimalMoves + 9).result.achievements.map((a) => a.id)).toContain('master_chemist');
    const s = { ...defaultGameSave(), daily: { history: {}, streak: 7 } };
    expect(evaluateAchievements(s, { level: level(1), moves: 9, undosUsed: 0, stars: 1 })).toContain('weekly_research');
  });
  it('achievement coins are included in coinsEarned and unlock time is stored', () => {
    const r = complete(defaultGameSave(), level(1), 99);
    expect(r.save.progress.achievements.first_reaction).toEqual({ unlockedAt: 1000 });
    expect(r.result.coinsEarned).toBe(50 + 25);
  });
});

describe('spendCoins', () => {
  it('spends, and refuses to go negative', () => {
    const s = { ...defaultGameSave(), economy: { coins: 120 } };
    expect(spendCoins(s, 100)!.economy.coins).toBe(20);
    expect(spendCoins(s, 121)).toBeNull();
    expect(spendCoins(s, ECONOMY.extraTube)).not.toBeNull();
  });
});

describe('continueTarget', () => {
  it('new player: PLAY level 1', () => {
    const t = continueTarget(defaultGameSave(), LEVELS, false);
    expect(t).toMatchObject({ label: 'PLAY', kind: 'level' });
    expect(t.level!.id).toBe('L001');
  });
  it('after progress: CONTINUE the next unplayed level', () => {
    const s = complete(defaultGameSave(), level(1), 4).save;
    const t = continueTarget(s, LEVELS, false);
    expect(t.label).toBe('CONTINUE');
    expect(t.level!.id).toBe('L002');
  });
  it('a saved session wins', () => {
    expect(continueTarget(defaultGameSave(), LEVELS, true)).toEqual({ label: 'CONTINUE', kind: 'resume' });
  });
  it('all done: stays on the last level', () => {
    let s = defaultGameSave();
    for (const l of LEVELS) s = complete(s, l, l.optimalMoves).save;
    expect(continueTarget(s, LEVELS, false).level!.id).toBe(LEVELS[LEVELS.length - 1].id);
  });
});
