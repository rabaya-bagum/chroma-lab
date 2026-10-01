/** Coin amounts and the research XP curve (§12.3, §12.6). Tune here. */
export const ECONOMY = {
  firstCompletion: 50,
  firstThreeStars: 25,
  replayCompletion: 5,
  dailyCompletion: 100,
  streakPerDay: 10,
  streakMax: 70,
  hint: 50,
  extraTube: 100,
  freeLevelsUpTo: 10,       // extra tubes and hints are free on levels 1-10
  freeHintsPerVisit: 1,
  xpPerStar: 10,
  xpPerDaily: 20,
} as const;

export const extraTubeCost = (levelNumber: number): number =>
  levelNumber <= ECONOMY.freeLevelsUpTo ? 0 : ECONOMY.extraTube;

export const streakBonus = (streakDay: number): number =>
  Math.min(ECONOMY.streakMax, ECONOMY.streakPerDay * Math.max(0, streakDay));

/** XP needed to reach lab level n (level 1 needs 0). */
export const xpForLevel = (n: number): number => 50 * (n - 1) * (n - 1);

export interface LabLevel { level: number; xpIntoLevel: number; xpForNext: number }

export function labLevelFor(xp: number): LabLevel {
  const safe = Math.max(0, Math.floor(xp));
  let level = 1;
  while (xpForLevel(level + 1) <= safe) level++;
  return { level, xpIntoLevel: safe - xpForLevel(level), xpForNext: xpForLevel(level + 1) - xpForLevel(level) };
}
