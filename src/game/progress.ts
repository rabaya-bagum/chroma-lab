import { ECONOMY } from '../config/economy';
import { ACHIEVEMENTS, evaluateAchievements } from '../data/achievements';
import { calculateStars } from './scoring';
import { recomputeDerived } from './save';
import type { GameSave } from './save';
import type { Level } from './types';

export interface RunSummary {
  moves: number;
  undosUsed: number;
  hintsUsed: number;
  extraTubeUsed: boolean;
}

export interface CompletionResult {
  stars: 1 | 2 | 3;
  moves: number;
  bestMoves: number;
  isNewBest: boolean;
  firstCompletion: boolean;
  firstThreeStars: boolean;
  /** Coins from the level itself (before achievements). */
  levelCoins: number;
  achievements: { id: string; name: string; reward: number }[];
  /** All coins added by this completion. */
  coinsEarned: number;
  starsGained: number;
}

export const isLevelCompleted = (save: GameSave, levelId: string): boolean =>
  (save.progress.levels[levelId]?.completions ?? 0) > 0;

export const isLevelUnlocked = (save: GameSave, level: Level): boolean =>
  level.number <= save.progress.highestUnlocked;

/** Record a finished level: stars, best moves, coins, achievements (§9, §12.3, §12.7). */
export function completeLevel(
  save: GameSave,
  level: Level,
  run: RunSummary,
  levels: readonly Level[],
  now: number,
): { save: GameSave; result: CompletionResult } {
  const stars = calculateStars(run.moves, level, { extraTubeUsed: run.extraTubeUsed });
  const prev = save.progress.levels[level.id];
  const firstCompletion = !prev || prev.completions < 1;
  const firstThreeStars = stars === 3 && (prev?.stars ?? 0) < 3;
  const isNewBest = !!prev?.bestMoves && run.moves < prev.bestMoves;
  const bestMoves = Math.min(prev?.bestMoves ?? Infinity, run.moves);

  const levelCoins =
    (firstCompletion ? ECONOMY.firstCompletion : ECONOMY.replayCompletion) +
    (firstThreeStars ? ECONOMY.firstThreeStars : 0);

  const record = {
    stars: Math.max(prev?.stars ?? 0, stars) as 0 | 1 | 2 | 3,
    bestMoves,
    completions: (prev?.completions ?? 0) + 1,
  };
  let next: GameSave = {
    ...save,
    progress: {
      ...save.progress,
      levels: { ...save.progress.levels, [level.id]: record },
      stats: {
        ...save.progress.stats,
        undos: save.progress.stats.undos + run.undosUsed,
        hints: save.progress.stats.hints + run.hintsUsed,
      },
      tutorialDone: save.progress.tutorialDone || !!level.tutorial,
    },
  };
  next = recomputeDerived(next, levels);

  const unlocked = evaluateAchievements(next, { level, moves: run.moves, undosUsed: run.undosUsed, stars });
  const achievements = unlocked.map((id) => ({ id, name: ACHIEVEMENTS[id].name, reward: ACHIEVEMENTS[id].reward }));
  const achievementCoins = achievements.reduce((n, a) => n + a.reward, 0);
  const achievementMap = { ...next.progress.achievements };
  for (const a of achievements) achievementMap[a.id] = { unlockedAt: now };

  next = {
    ...next,
    progress: { ...next.progress, achievements: achievementMap },
    economy: { coins: next.economy.coins + levelCoins + achievementCoins },
  };

  return {
    save: next,
    result: {
      stars,
      moves: run.moves,
      bestMoves,
      isNewBest,
      firstCompletion,
      firstThreeStars,
      levelCoins,
      achievements,
      coinsEarned: levelCoins + achievementCoins,
      starsGained: next.progress.starsTotal - save.progress.starsTotal,
    },
  };
}

/** Spend coins. Returns null if the player cannot afford it (coins never go negative). */
export function spendCoins(save: GameSave, amount: number): GameSave | null {
  if (amount < 0 || save.economy.coins < amount) return null;
  return { ...save, economy: { coins: save.economy.coins - amount } };
}

export interface ContinueTarget {
  /** Button label: PLAY for a brand new player, otherwise CONTINUE. */
  label: 'PLAY' | 'CONTINUE';
  kind: 'resume' | 'level';
  level?: Level;
}

/** What the home button does (§12.1). A saved in-progress session wins; otherwise the next unplayed level. */
export function continueTarget(save: GameSave, levels: readonly Level[], hasSession: boolean): ContinueTarget {
  const anyDone = levels.some((l) => isLevelCompleted(save, l.id));
  const label = anyDone || hasSession ? 'CONTINUE' : 'PLAY';
  if (hasSession) return { label, kind: 'resume' };
  const next = levels.find((l) => l.number <= save.progress.highestUnlocked && !isLevelCompleted(save, l.id));
  return { label, kind: 'level', level: next ?? levels[levels.length - 1] };
}
