import { defaultSave } from '../game/save';
import type { SaveDataV1 } from '../game/save';
import type { Level } from '../game/types';
import { parseSave } from './saveParser';

export const SAVE_KEY = 'chroma.save';
export const SESSION_KEY = 'chroma.session';
export const DEBOUNCE_MS = 500;

/** The subset of AsyncStorage the game uses (also easy to fake in tests). */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export type LoadStatus = 'ok' | 'fresh' | 'corrupt';
export interface LoadResult { save: SaveDataV1; status: LoadStatus }

export function createPersistence(kv: KeyValueStore, levels: readonly Level[], now: () => number = Date.now) {
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingSave: SaveDataV1 | null = null;
  let sessionTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingSession: string | null = null;

  const writeSave = async () => {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (!pendingSave) return;
    const data = pendingSave;
    pendingSave = null;
    try { await kv.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* storage full or unavailable: keep playing */ }
  };
  const writeSession = async () => {
    if (sessionTimer) { clearTimeout(sessionTimer); sessionTimer = null; }
    if (pendingSession === null) return;
    const json = pendingSession;
    pendingSession = null;
    try { await kv.setItem(SESSION_KEY, json); } catch { /* ignore */ }
  };

  return {
    /** Load and validate. A corrupt value is copied aside and defaults are returned (§15). */
    async load(): Promise<LoadResult> {
      let raw: string | null = null;
      try { raw = await kv.getItem(SAVE_KEY); } catch { return { save: defaultSave(), status: 'fresh' }; }
      if (raw === null) return { save: defaultSave(), status: 'fresh' };
      let parsed: SaveDataV1 | null = null;
      try { parsed = parseSave(JSON.parse(raw), levels); } catch { parsed = null; }
      if (parsed) return { save: parsed, status: 'ok' };
      try { await kv.setItem(`${SAVE_KEY}.corrupt.${now()}`, raw); } catch { /* ignore */ }
      return { save: defaultSave(), status: 'corrupt' };
    },

    /** Debounced write (500 ms); only the latest value is written. */
    scheduleSave(save: SaveDataV1): void {
      pendingSave = save;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => { void writeSave(); }, DEBOUNCE_MS);
    },

    async loadSession(): Promise<string | null> {
      try { return await kv.getItem(SESSION_KEY); } catch { return null; }
    },
    scheduleSession(json: string): void {
      pendingSession = json;
      if (sessionTimer) clearTimeout(sessionTimer);
      sessionTimer = setTimeout(() => { void writeSession(); }, DEBOUNCE_MS);
    },
    /** Remove the in-progress session now (level solved or exited). */
    async clearSession(): Promise<void> {
      pendingSession = null;
      if (sessionTimer) { clearTimeout(sessionTimer); sessionTimer = null; }
      try { await kv.removeItem(SESSION_KEY); } catch { /* ignore */ }
    },

    /** Write anything pending now (app going to the background). */
    async flush(): Promise<void> { await Promise.all([writeSave(), writeSession()]); },
  };
}

export type Persistence = ReturnType<typeof createPersistence>;
