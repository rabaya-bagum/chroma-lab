import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { Level } from '../game/types';
import { loadDailyLevel } from '../services/dailyPuzzle';
import type { DailySource } from '../services/dailyPuzzle';
import { localDateKey } from '../utils/date';

interface DailyStore {
  dateKey: string | null;
  level: Level | null;
  source: DailySource | null;
  status: 'idle' | 'loading' | 'ready';
  /** Make sure the puzzle for `dateKey` (default: today) is loaded; resolves when ready. */
  ensure(dateKey?: string): Promise<Level>;
}

let inflight: { key: string; promise: Promise<Level> } | null = null;

export const useDailyStore = create<DailyStore>((set, get) => ({
  dateKey: null,
  level: null,
  source: null,
  status: 'idle',

  ensure: (dateKey = localDateKey()) => {
    const s = get();
    if (s.level && s.dateKey === dateKey) return Promise.resolve(s.level);
    if (inflight && inflight.key === dateKey) return inflight.promise;
    set({ status: 'loading', dateKey, level: null, source: null });
    const promise = loadDailyLevel(dateKey, { kv: AsyncStorage }).then(({ level, source }) => {
      if (get().dateKey === dateKey) set({ level, source, status: 'ready' });
      return level;
    }).finally(() => { if (inflight?.key === dateKey) inflight = null; });
    inflight = { key: dateKey, promise };
    return promise;
  },
}));
