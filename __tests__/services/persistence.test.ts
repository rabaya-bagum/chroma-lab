import { LEVELS } from '../../src/data/levels';
import { defaultSave } from '../../src/game/save';
import type { SaveDataV1 } from '../../src/game/save';
import { migrate } from '../../src/services/migrations';
import { parseSave } from '../../src/services/saveParser';
import { createPersistence, DEBOUNCE_MS, SAVE_KEY, SESSION_KEY } from '../../src/services/storage';
import type { KeyValueStore } from '../../src/services/storage';

class MemKV implements KeyValueStore {
  data = new Map<string, string>();
  writes: string[] = [];
  async getItem(k: string) { return this.data.get(k) ?? null; }
  async setItem(k: string, v: string) { this.writes.push(k); this.data.set(k, v); }
  async removeItem(k: string) { this.data.delete(k); }
}

const V1_FIXTURE = {
  version: 1,
  progress: {
    levels: { L001: { stars: 3, bestMoves: 4, completions: 2 }, L002: { stars: 1, bestMoves: 12, completions: 1 }, L003: { stars: 0, completions: 0 } },
    highestUnlocked: 99, starsTotal: 99, researchXp: 12345, labUnlocked: ['microscope'],
    achievements: { first_reaction: { unlockedAt: 1700000000000 } },
    stats: { levelsCompleted: 77, undos: 5, hints: 1 },
    tutorialDone: true,
  },
  economy: { coins: 340 },
  cosmetics: { owned: ['tube.classic', 'tube.neon'], selected: { tube: 'tube.neon', theme: 'theme.research', pour: 'pour.classic' } },
  daily: { history: { '2026-09-30': { moves: 20, timeMs: 90000 } }, streak: 2, lastDate: '2026-09-30' },
  settings: { music: false, sound: true, haptics: true, colorBlind: true, patterns: false, labels: true, highContrast: false, reduceMotion: 'on' },
};

describe('migrations', () => {
  it('passes a current-version save through', () => {
    expect(migrate({ version: 1, a: 1 })).toEqual({ ok: true, data: { version: 1, a: 1 } });
  });
  it('runs every migration from the stored version up to current, in order', () => {
    const m1 = (d: Record<string, unknown>) => ({ ...d, trail: [...((d.trail as string[]) ?? []), 'v1->v2'] });
    const m2 = (d: Record<string, unknown>) => ({ ...d, trail: [...((d.trail as string[]) ?? []), 'v2->v3'] });
    expect(migrate({ version: 1 }, [m1, m2], 3)).toEqual({ ok: true, data: { version: 3, trail: ['v1->v2', 'v2->v3'] } });
    expect(migrate({ version: 2 }, [m1, m2], 3)).toEqual({ ok: true, data: { version: 3, trail: ['v2->v3'] } });
  });
  it('rejects bad input, newer versions and failing migrations', () => {
    expect(migrate(null)).toMatchObject({ ok: false, reason: 'notObject' });
    expect(migrate([])).toMatchObject({ ok: false, reason: 'notObject' });
    expect(migrate({})).toMatchObject({ ok: false, reason: 'noVersion' });
    expect(migrate({ version: '1' })).toMatchObject({ ok: false, reason: 'noVersion' });
    expect(migrate({ version: 2 })).toMatchObject({ ok: false, reason: 'tooNew' });
    expect(migrate({ version: 1 }, [() => { throw new Error('x'); }], 2)).toMatchObject({ ok: false, reason: 'failed' });
    expect(migrate({ version: 1 }, [], 2)).toMatchObject({ ok: false, reason: 'failed' });
  });
});

describe('parseSave', () => {
  it('loads a v1 fixture and recomputes derived values instead of trusting them', () => {
    const s = parseSave(V1_FIXTURE, LEVELS)!;
    expect(s).not.toBeNull();
    expect(s.progress.starsTotal).toBe(4);
    expect(s.progress.researchXp).toBe(4 * 10 + 1 * 20);
    expect(s.progress.highestUnlocked).toBe(3);
    expect(s.progress.stats.levelsCompleted).toBe(2);
    expect(s.economy.coins).toBe(340);
    expect(s.settings).toMatchObject({ music: false, colorBlind: true, reduceMotion: 'on' });
    expect(s.cosmetics.selected.tube).toBe('tube.neon');
    expect(s.daily).toMatchObject({ streak: 2, lastDate: '2026-09-30' });
  });
  it('round-trips a default save', () => {
    const d = defaultSave();
    expect(parseSave(JSON.parse(JSON.stringify(d)), LEVELS)).toEqual(d);
  });
  it('fills missing optional sections with defaults', () => {
    const s = parseSave({ version: 1, progress: {}, economy: { coins: 5 } }, LEVELS)!;
    expect(s.settings).toEqual(defaultSave().settings);
    expect(s.cosmetics).toEqual(defaultSave().cosmetics);
  });
  it('rejects structurally invalid saves', () => {
    expect(parseSave({ version: 1 }, LEVELS)).toBeNull();
    expect(parseSave({ version: 1, progress: { levels: { L001: { stars: 7, completions: 1 } } }, economy: { coins: 1 } }, LEVELS)).toBeNull();
    expect(parseSave({ version: 1, progress: {}, economy: { coins: 'lots' } }, LEVELS)).toBeNull();
    expect(parseSave('nope', LEVELS)).toBeNull();
  });
  it('never allows negative coins', () => {
    expect(parseSave({ version: 1, progress: {}, economy: { coins: -50 } }, LEVELS)!.economy.coins).toBe(0);
  });
});

describe('persistence service', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('fresh install returns defaults', async () => {
    const r = await createPersistence(new MemKV(), LEVELS).load();
    expect(r.status).toBe('fresh');
    expect(r.save).toEqual(defaultSave());
  });
  it('loads a stored v1 save', async () => {
    const kv = new MemKV();
    kv.data.set(SAVE_KEY, JSON.stringify(V1_FIXTURE));
    const r = await createPersistence(kv, LEVELS).load();
    expect(r.status).toBe('ok');
    expect(r.save.economy.coins).toBe(340);
  });
  it('a corrupt save is copied aside and defaults are returned', async () => {
    const kv = new MemKV();
    kv.data.set(SAVE_KEY, '{not json');
    const r = await createPersistence(kv, LEVELS, () => 12345).load();
    expect(r.status).toBe('corrupt');
    expect(r.save).toEqual(defaultSave());
    expect(kv.data.get(`${SAVE_KEY}.corrupt.12345`)).toBe('{not json');
  });
  it('a structurally invalid save is also treated as corrupt', async () => {
    const kv = new MemKV();
    kv.data.set(SAVE_KEY, JSON.stringify({ version: 1, progress: 5 }));
    expect((await createPersistence(kv, LEVELS, () => 1).load()).status).toBe('corrupt');
  });
  it('debounces writes by 500 ms and writes only the latest value', async () => {
    const kv = new MemKV();
    const p = createPersistence(kv, LEVELS);
    const a: SaveDataV1 = { ...defaultSave(), economy: { coins: 1 } };
    const b: SaveDataV1 = { ...defaultSave(), economy: { coins: 2 } };
    p.scheduleSave(a);
    jest.advanceTimersByTime(DEBOUNCE_MS - 1);
    p.scheduleSave(b);
    jest.advanceTimersByTime(DEBOUNCE_MS - 1);
    expect(kv.writes).toHaveLength(0);
    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(kv.writes).toEqual([SAVE_KEY]);
    expect(JSON.parse(kv.data.get(SAVE_KEY)!).economy.coins).toBe(2);
  });
  it('flush writes pending data immediately (app backgrounded)', async () => {
    const kv = new MemKV();
    const p = createPersistence(kv, LEVELS);
    p.scheduleSave({ ...defaultSave(), economy: { coins: 9 } });
    p.scheduleSession('{"v":1}');
    await p.flush();
    expect(JSON.parse(kv.data.get(SAVE_KEY)!).economy.coins).toBe(9);
    expect(kv.data.get(SESSION_KEY)).toBe('{"v":1}');
    jest.advanceTimersByTime(2000);
    await Promise.resolve();
    expect(kv.writes).toHaveLength(2); // no duplicate write from the old timers
  });
  it('clearSession removes the session and cancels a pending write', async () => {
    const kv = new MemKV();
    const p = createPersistence(kv, LEVELS);
    p.scheduleSession('{"v":1}');
    await p.clearSession();
    jest.advanceTimersByTime(2000);
    await Promise.resolve();
    expect(kv.data.has(SESSION_KEY)).toBe(false);
    expect(await p.loadSession()).toBeNull();
  });
  it('storage failures never throw', async () => {
    const bad: KeyValueStore = {
      getItem: () => Promise.reject(new Error('x')), setItem: () => Promise.reject(new Error('x')), removeItem: () => Promise.reject(new Error('x')),
    };
    const p = createPersistence(bad, LEVELS);
    expect((await p.load()).status).toBe('fresh');
    p.scheduleSave(defaultSave());
    await expect(p.flush()).resolves.toBeUndefined();
    await expect(p.clearSession()).resolves.toBeUndefined();
    expect(await p.loadSession()).toBeNull();
  });
});
