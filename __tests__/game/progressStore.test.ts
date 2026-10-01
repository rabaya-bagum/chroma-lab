import { LEVELS } from '../../src/data/levels';
import { applyMove, createSession } from '../../src/game/session';
import { defaultSave } from '../../src/game/save';
import { isLevelUnlocked } from '../../src/game/progress';
import { useGameStore } from '../../src/store/gameStore';
import { useProgressStore } from '../../src/store/progressStore';
import { effectivePatterns, persistedSettings, DEFAULT_SETTINGS } from '../../src/store/settingsStore';

const solveLevel1 = (undos = false) => {
  let s = createSession(LEVELS[0]);
  for (const [from, to] of [[0, 3], [1, 3], [2, 0], [2, 1]]) s = applyMove(s, { from, to }).session;
  return { ...s, undosUsed: undos ? 2 : 0 };
};

describe('progressStore', () => {
  beforeEach(() => useProgressStore.getState().hydrate(defaultSave()));

  it('hydrate strips settings into the game save and marks hydrated', () => {
    const st = useProgressStore.getState();
    expect(st.hydrated).toBe(true);
    expect('settings' in st.save).toBe(false);
  });
  it('recordCompletion updates progress and exposes the result for the overlay', () => {
    const r = useProgressStore.getState().recordCompletion(LEVELS[0], solveLevel1(), 5);
    const st = useProgressStore.getState();
    expect(r.stars).toBe(3);
    expect(st.lastCompletion).toBe(r);
    expect(st.save.economy.coins).toBe(r.coinsEarned);
    expect(isLevelUnlocked(st.save, LEVELS[1])).toBe(true);
    st.clearCompletion();
    expect(useProgressStore.getState().lastCompletion).toBeNull();
  });
  it('spend refuses when short and never goes negative', () => {
    expect(useProgressStore.getState().spend(1)).toBe(false);
    useProgressStore.getState().recordCompletion(LEVELS[0], solveLevel1());
    const coins = useProgressStore.getState().save.economy.coins;
    expect(useProgressStore.getState().spend(coins + 1)).toBe(false);
    expect(useProgressStore.getState().spend(100)).toBe(true);
    expect(useProgressStore.getState().save.economy.coins).toBe(coins - 100);
  });
  it('resetProgress wipes progress and coins', () => {
    useProgressStore.getState().recordCompletion(LEVELS[0], solveLevel1());
    useProgressStore.getState().resetProgress();
    const { save } = useProgressStore.getState();
    expect(save.economy.coins).toBe(0);
    expect(save.progress.levels).toEqual({});
    expect(save.progress.highestUnlocked).toBe(1);
  });
  it('markTutorialDone is idempotent', () => {
    useProgressStore.getState().markTutorialDone();
    useProgressStore.getState().markTutorialDone();
    expect(useProgressStore.getState().save.progress.tutorialDone).toBe(true);
  });
});

describe('gameStore session helpers', () => {
  it('resume restores a session and tick accumulates play time until solved', () => {
    const s = applyMove(createSession(LEVELS[0]), { from: 0, to: 3 }).session;
    useGameStore.getState().resume(s);
    useGameStore.getState().tick(1000);
    useGameStore.getState().tick(1000);
    expect(useGameStore.getState().session!.elapsedMs).toBe(2000);
    useGameStore.getState().resume(solveLevel1());
    useGameStore.getState().tick(1000);
    expect(useGameStore.getState().session!.elapsedMs).toBe(0);
  });
});

describe('settings persistence helpers', () => {
  it('persistedSettings drops the OS reduce-motion flag', () => {
    const p = persistedSettings({ ...DEFAULT_SETTINGS, systemReduceMotion: true });
    expect('systemReduceMotion' in p).toBe(false);
    expect(effectivePatterns(p)).toBe(false);
  });
});
