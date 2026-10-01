import { create } from 'zustand';
import { LEVELS } from '../data/levels';
import { ACHIEVEMENTS } from '../data/achievements';
import { buyCosmetic, selectCosmetic } from '../game/cosmetics';
import { completeDaily } from '../game/daily';
import type { DailyResult } from '../game/daily';
import { completeLevel, spendCoins } from '../game/progress';
import type { CompletionResult } from '../game/progress';
import { defaultGameSave } from '../game/save';
import type { GameSave, SaveDataV1 } from '../game/save';
import type { Level, Session } from '../game/types';

interface ProgressStore {
  hydrated: boolean;
  save: GameSave;
  /** One-time message shown after loading (for example a corrupt save). */
  notice: string | null;
  /** Result of the most recent completion, shown by the win overlay. */
  lastCompletion: CompletionResult | null;
  /** Result of the most recent daily completion. */
  lastDaily: DailyResult | null;
  hydrate(save: SaveDataV1, notice?: string | null): void;
  /** Record a solved level; returns what the win overlay should show. */
  recordCompletion(level: Level, session: Session, now?: number): CompletionResult;
  /** Record a solved daily puzzle (`level.id` is `daily-<date>`). */
  recordDaily(level: Level, session: Session, now?: number): DailyResult;
  buyCosmetic(id: string): boolean;
  equipCosmetic(id: string): boolean;
  /** Spend coins; false (and no change) if the player cannot afford it. */
  spend(amount: number): boolean;
  markTutorialDone(): void;
  /** Wipe progress, economy, cosmetics and daily data. Settings are kept. */
  resetProgress(): void;
  clearNotice(): void;
  clearCompletion(): void;
  clearDaily(): void;
}

const gameSaveOf = (s: SaveDataV1): GameSave => {
  const { settings: _settings, ...rest } = s;
  return rest;
};

export const useProgressStore = create<ProgressStore>((set, get) => ({
  hydrated: false,
  save: defaultGameSave(),
  notice: null,
  lastCompletion: null,
  lastDaily: null,

  hydrate: (save, notice = null) => set({ hydrated: true, save: gameSaveOf(save), notice }),

  recordCompletion: (level, session, now = Date.now()) => {
    const { save, result } = completeLevel(
      get().save,
      level,
      {
        moves: session.current.moves,
        undosUsed: session.undosUsed,
        hintsUsed: session.hintsUsed,
        extraTubeUsed: session.extraTubeUsed,
      },
      LEVELS,
      now,
    );
    set({ save, lastCompletion: result });
    return result;
  },

  recordDaily: (level, session, now = Date.now()) => {
    const dateKey = level.id.replace(/^daily-/, '');
    const { save, result } = completeDaily(
      get().save, dateKey, { moves: session.current.moves, timeMs: session.elapsedMs }, LEVELS, now, ACHIEVEMENTS,
    );
    set({ save, lastDaily: result });
    return result;
  },

  buyCosmetic: (id) => {
    const next = buyCosmetic(get().save, id);
    if (!next) return false;
    set({ save: next });
    return true;
  },

  equipCosmetic: (id) => {
    const next = selectCosmetic(get().save, id);
    if (!next) return false;
    set({ save: next });
    return true;
  },

  spend: (amount) => {
    const next = spendCoins(get().save, amount);
    if (!next) return false;
    set({ save: next });
    return true;
  },

  markTutorialDone: () => {
    const s = get().save;
    if (!s.progress.tutorialDone) set({ save: { ...s, progress: { ...s.progress, tutorialDone: true } } });
  },

  resetProgress: () => set({ save: defaultGameSave() }),
  clearNotice: () => set({ notice: null }),
  clearCompletion: () => set({ lastCompletion: null }),
  clearDaily: () => set({ lastDaily: null }),
}));
