import { earnedEquipment } from '../data/labEquipment';
import { grantEarned } from './cosmetics';
import type { Level } from './types';

export interface LevelRecord { stars: 0 | 1 | 2 | 3; bestMoves?: number; completions: number }

/** Persisted data, version 1 (§15). */
export interface SaveDataV1 {
  version: 1;
  progress: {
    levels: Record<string, LevelRecord>;
    highestUnlocked: number;
    starsTotal: number;
    researchXp: number;
    labUnlocked: string[];
    achievements: Record<string, { unlockedAt: number }>;
    stats: { levelsCompleted: number; undos: number; hints: number };
    tutorialDone: boolean;
  };
  economy: { coins: number };
  cosmetics: { owned: string[]; selected: { tube: string; theme: string; pour: string } };
  daily: { history: Record<string, { moves: number; timeMs: number }>; streak: number; lastDate?: string };
  settings: {
    music: boolean; sound: boolean; haptics: boolean;
    colorBlind: boolean; patterns: boolean; labels: boolean;
    highContrast: boolean; reduceMotion: 'system' | 'on' | 'off';
  };
}

/** Everything in a save except settings (owned by the settings store). */
export type GameSave = Omit<SaveDataV1, 'settings'>;

export const CURRENT_VERSION = 1;

export const DEFAULT_SETTINGS: SaveDataV1['settings'] = {
  music: true, sound: true, haptics: true,
  colorBlind: false, patterns: false, labels: false,
  highContrast: false, reduceMotion: 'system',
};

export function defaultGameSave(): GameSave {
  return {
    version: 1,
    progress: {
      levels: {},
      highestUnlocked: 1,
      starsTotal: 0,
      researchXp: 0,
      labUnlocked: [],
      achievements: {},
      stats: { levelsCompleted: 0, undos: 0, hints: 0 },
      tutorialDone: false,
    },
    economy: { coins: 0 },
    cosmetics: { owned: ['tube.classic', 'theme.research', 'pour.classic'], selected: { tube: 'tube.classic', theme: 'theme.research', pour: 'pour.classic' } },
    daily: { history: {}, streak: 0 },
  };
}

export const defaultSave = (): SaveDataV1 => ({ ...defaultGameSave(), settings: { ...DEFAULT_SETTINGS } });

const XP_PER_STAR = 10;
const XP_PER_DAILY = 20;

/**
 * Recompute values that are derived from the level records, so a stale or
 * tampered stored value is never trusted (§15). `levels` is the shipped level list.
 */
export function recomputeDerived<T extends GameSave>(save: T, levels: readonly Level[]): T {
  const records = save.progress.levels;
  let starsTotal = 0, completed = 0, highestDone = 0;
  for (const level of levels) {
    const r = records[level.id];
    if (!r || r.completions < 1) continue;
    starsTotal += r.stars;
    completed++;
    highestDone = Math.max(highestDone, level.number);
  }
  const dailyCount = Object.keys(save.daily.history).length;
  const derived = {
    ...save,
    progress: {
      ...save.progress,
      labUnlocked: earnedEquipment(starsTotal),
      starsTotal,
      researchXp: starsTotal * XP_PER_STAR + dailyCount * XP_PER_DAILY,
      highestUnlocked: Math.min(Math.max(1, highestDone + 1), Math.max(1, levels.length)),
      stats: { ...save.progress.stats, levelsCompleted: completed },
    },
  };
  return grantEarned(derived) as T; // grantEarned spreads the save, so any extra fields (settings) survive
}
