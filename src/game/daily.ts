import { ECONOMY, streakBonus } from '../config/economy';
import { LevelGenerator, GENERATOR_VERSION } from './generator';
import type { LevelSpec } from './generator';
import { defineLevel } from './levelCodec';
import { recomputeDerived } from './save';
import type { GameSave } from './save';
import type { Level, LiquidColor } from './types';
import { daysBetween, hashString } from '../utils/date';

const DAILY_COLORS: LiquidColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

export const dailySeed = (dateKey: string, version: string = GENERATOR_VERSION): string =>
  `chroma-daily-${version}-${dateKey}`;

export const dailyLevelId = (dateKey: string): string => `daily-${dateKey}`;
export const isDailyId = (id: string): boolean => id.startsWith('daily-');

/** Medium-hard daily puzzle spec (5 or 6 colours, §12.4). Depends only on the date, so every device agrees. */
export function dailySpec(dateKey: string): LevelSpec {
  const six = hashString(`${dateKey}:colours`) % 2 === 1;
  return {
    id: dailyLevelId(dateKey),
    number: 0,
    chapter: 0,
    difficulty: six ? 'hard' : 'medium',
    colors: DAILY_COLORS.slice(0, six ? 6 : 5),
    empties: 2,
    optMin: six ? 17 : 14,
    optMax: six ? 21 : 18,
  };
}

/** Bounded work per daily puzzle: attempts and the solver's node budget per attempt. */
export const DAILY_MAX_ATTEMPTS = 400;
export const DAILY_SOLVE = { maxNodes: 60_000, fallbackNodes: 0 } as const;

/** A step-able generator; call `tryNext` in short slices and stop at DAILY_MAX_ATTEMPTS. */
export function createDailyGenerator(dateKey: string): LevelGenerator {
  return new LevelGenerator(dailySpec(dateKey), dailySeed(dateKey), { solve: DAILY_SOLVE });
}

/** Synchronous convenience (tests and the pool script). Null if the bounded attempts fail. */
export function generateDaily(dateKey: string): Level | null {
  const gen = createDailyGenerator(dateKey);
  while (gen.attempts < DAILY_MAX_ATTEMPTS) {
    const r = gen.tryNext();
    if (r && r.level.optimalIsExact) return r.level;
  }
  return null;
}

// --- fallback pool ----------------------------------------------------------

export const DAILY_POOL_SIZE = 60;

export interface PoolEntry { tubes: string[]; optimalMoves: number; difficulty: 'medium' | 'hard'; seed: string }

export const poolIndexFor = (dateKey: string): number => hashString(`pool:${dateKey}`) % DAILY_POOL_SIZE;

/** A shipped, pre-verified puzzle dressed up as the daily level for `dateKey`. */
export function levelFromPool(pool: readonly PoolEntry[], dateKey: string): Level {
  const e = pool[poolIndexFor(dateKey) % pool.length];
  return defineLevel({
    id: dailyLevelId(dateKey), number: 0, chapter: 0, difficulty: e.difficulty,
    optimalMoves: e.optimalMoves, optimalIsExact: true, tubes: e.tubes,
    meta: { generatorVersion: GENERATOR_VERSION, seed: `pool:${e.seed}` },
  });
}

// --- completion, streaks, rewards -----------------------------------------------

export interface DailyRun { moves: number; timeMs: number }

export interface DailyResult {
  dateKey: string;
  firstCompletion: boolean;
  moves: number;
  timeMs: number;
  bestMoves: number;
  bestTimeMs: number;
  streak: number;
  streakBonus: number;
  coinsEarned: number;
  achievements: { id: string; name: string; reward: number }[];
  unlockedCosmetics: string[];
}

/** Streak shown to the player: 0 once a day has been missed (§12.4). */
export function currentStreak(save: Pick<GameSave, 'daily'>, todayKey: string): number {
  const last = save.daily.lastDate;
  if (!last) return 0;
  const gap = daysBetween(last, todayKey);
  return gap === 0 || gap === 1 ? save.daily.streak : 0;
}

export const hasCompletedDaily = (save: Pick<GameSave, 'daily'>, dateKey: string): boolean => !!save.daily.history[dateKey];

/**
 * Record a daily completion. Only the first completion of a date pays coins
 * and moves the streak; later replays can only improve the stored bests.
 */
export function completeDaily(
  save: GameSave,
  dateKey: string,
  run: DailyRun,
  levels: readonly Level[],
  now: number,
  achievementDefs: Record<string, { name: string; reward: number }>,
): { save: GameSave; result: DailyResult } {
  const prev = save.daily.history[dateKey];
  const first = !prev;
  const entry = {
    moves: Math.min(prev?.moves ?? Infinity, run.moves),
    timeMs: Math.min(prev?.timeMs ?? Infinity, run.timeMs),
  };

  let streak = save.daily.streak;
  let bonus = 0;
  let coins = 0;
  let lastDate = save.daily.lastDate;
  if (first) {
    const gap = lastDate ? daysBetween(lastDate, dateKey) : null;
    streak = gap === 1 ? streak + 1 : gap !== null && gap < 0 ? streak : 1; // an older date (clock change) never breaks the streak
    if (!lastDate || daysBetween(lastDate, dateKey) > 0) lastDate = dateKey;
    bonus = streakBonus(streak);
    coins = ECONOMY.dailyCompletion + bonus;
  }

  let next: GameSave = {
    ...save,
    daily: { history: { ...save.daily.history, [dateKey]: entry }, streak, ...(lastDate ? { lastDate } : {}) },
  };
  next = recomputeDerived(next, levels);

  // 7-day streak achievement
  const achievements: DailyResult['achievements'] = [];
  if (next.daily.streak >= 7 && !next.progress.achievements.weekly_research && achievementDefs.weekly_research) {
    const a = achievementDefs.weekly_research;
    achievements.push({ id: 'weekly_research', name: a.name, reward: a.reward });
    next = { ...next, progress: { ...next.progress, achievements: { ...next.progress.achievements, weekly_research: { unlockedAt: now } } } };
    coins += a.reward;
  }
  next = { ...next, economy: { coins: next.economy.coins + coins } };

  return {
    save: next,
    result: {
      dateKey, firstCompletion: first, moves: run.moves, timeMs: run.timeMs,
      bestMoves: entry.moves, bestTimeMs: entry.timeMs, streak: next.daily.streak,
      streakBonus: bonus, coinsEarned: coins, achievements,
      unlockedCosmetics: next.cosmetics.owned.filter((id) => !save.cosmetics.owned.includes(id)),
    },
  };
}

