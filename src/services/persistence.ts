import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { LEVELS } from '../data/levels';
import { isPuzzleSolved } from '../game/rules';
import { deserializeSession, serializeSession } from '../game/serialize';
import type { SaveDataV1 } from '../game/save';
import { isDailyId } from '../game/daily';
import type { Level, Session } from '../game/types';
import { loadCachedDaily } from './dailyPuzzle';
import { useGameStore } from '../store/gameStore';
import { useProgressStore } from '../store/progressStore';
import { persistedSettings, useSettingsStore } from '../store/settingsStore';
import { createPersistence } from './storage';

/** The app's single persistence instance, backed by AsyncStorage. */
export const persistence = createPersistence(AsyncStorage, LEVELS);

function buildSave(): SaveDataV1 {
  return { ...useProgressStore.getState().save, settings: persistedSettings(useSettingsStore.getState()) };
}

let started = false;

/**
 * Load the save, push it into the stores, then keep it written: debounced
 * saves on every change, and a flush when the app goes to the background.
 */
export async function initPersistence(): Promise<void> {
  if (started) return;
  started = true;
  const { save, status } = await persistence.load();
  useSettingsStore.getState().set({ ...save.settings });
  useProgressStore.getState().hydrate(
    save,
    status === 'corrupt' ? 'Your saved progress could not be read, so a fresh save was started.' : null,
  );

  const saveNow = () => persistence.scheduleSave(buildSave());
  useProgressStore.subscribe(saveNow);
  useSettingsStore.subscribe((s, prev) => {
    const a = persistedSettings(s), b = persistedSettings(prev);
    if (JSON.stringify(a) !== JSON.stringify(b)) saveNow();
  });

  // In-progress level: written when the board changes, removed when solved. Exiting clears it explicitly.
  useGameStore.subscribe((s, prev) => {
    const session = s.session;
    if (!session) return;
    if (isPuzzleSolved(session.current)) { void persistence.clearSession(); return; }
    const prevSession = prev.session;
    if (
      prevSession &&
      prevSession.current === session.current &&
      prevSession.extraTubeUsed === session.extraTubeUsed &&
      prevSession.hintsUsed === session.hintsUsed
    ) return; // timer tick only
    persistence.scheduleSession(serializeSession(session));
  });

  AppState.addEventListener('change', (state) => {
    if (state === 'active') return;
    const session = useGameStore.getState().session;
    if (session && !isPuzzleSolved(session.current)) persistence.scheduleSession(serializeSession(session)); // include elapsed time
    void persistence.flush();
  });
}

/** A valid saved in-progress session, or null. */
export async function loadSavedSession(): Promise<Session | null> {
  const json = await persistence.loadSession();
  if (!json) return null;
  // a saved daily puzzle needs that day's level, which lives in the daily cache
  let levels: readonly Level[] = LEVELS;
  try {
    const id = (JSON.parse(json) as { levelId?: unknown }).levelId;
    if (typeof id === 'string' && isDailyId(id)) {
      const daily = await loadCachedDaily(AsyncStorage, id.replace(/^daily-/, ''));
      if (daily) levels = [...LEVELS, daily];
    }
  } catch { return null; }
  return deserializeSession(json, levels);
}
