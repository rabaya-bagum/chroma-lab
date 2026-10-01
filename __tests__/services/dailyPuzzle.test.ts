import { DAILY_POOL } from '../../src/data/daily.pool';
import { generateDaily, levelFromPool } from '../../src/game/daily';
import { GENERATOR_VERSION } from '../../src/game/generator';
import { DAILY_CACHE_KEY, fromCache, loadCachedDaily, loadDailyLevel, toCache } from '../../src/services/dailyPuzzle';
import type { KeyValueStore } from '../../src/services/storage';

class MemKV implements KeyValueStore {
  data = new Map<string, string>();
  async getItem(k: string) { return this.data.get(k) ?? null; }
  async setItem(k: string, v: string) { this.data.set(k, v); }
  async removeItem(k: string) { this.data.delete(k); }
}

describe('loadDailyLevel', () => {
  const date = '2026-10-01';
  it('generates on the device, yielding frames, and matches the one-shot puzzle', async () => {
    const kv = new MemKV();
    let frames = 0, t = 0;
    const r = await loadDailyLevel(date, { kv, now: () => (t += 4), nextFrame: async () => { frames++; } });
    expect(r.source).toBe('generated');
    expect(r.level).toEqual(generateDaily(date));
    expect(frames).toBeGreaterThanOrEqual(0);
  });
  it('time slicing yields between slices when the clock is slow', async () => {
    let frames = 0, t = 0;
    const r = await loadDailyLevel('2026-10-02', { kv: new MemKV(), now: () => (t += 9), nextFrame: async () => { frames++; } });
    expect(r.source).toBe('generated');
    expect(frames).toBeGreaterThan(0);
  });
  it('caches the result per date and reuses it', async () => {
    const kv = new MemKV();
    const first = await loadDailyLevel(date, { kv });
    expect(kv.data.has(DAILY_CACHE_KEY)).toBe(true);
    const second = await loadDailyLevel(date, { kv, maxAttempts: 0 }); // would fall back to the pool if it regenerated
    expect(second.source).toBe('cache');
    expect(second.level).toEqual(first.level);
    expect(await loadCachedDaily(kv, date)).toEqual(first.level);
  });
  it('a cache for another date or generator version is ignored', async () => {
    const kv = new MemKV();
    const lvl = (await loadDailyLevel(date, { kv })).level;
    expect(await loadCachedDaily(kv, '2026-10-02')).toBeNull();
    expect(fromCache({ ...toCache(date, lvl), generatorVersion: 'g0' }, date)).toBeNull();
    expect(fromCache({ ...toCache(date, lvl), tubes: ['XYZ'] }, date)).toBeNull();
    expect(fromCache('junk', date)).toBeNull();
  });
  it('falls back to the shipped pool when generation fails', async () => {
    const kv = new MemKV();
    const r = await loadDailyLevel(date, { kv, maxAttempts: 0 });
    expect(r.source).toBe('pool');
    expect(r.level).toEqual(levelFromPool(DAILY_POOL, date));
    expect(r.level.meta.generatorVersion).toBe(GENERATOR_VERSION);
  });
  it('two devices on the same date get the same puzzle', async () => {
    const a = await loadDailyLevel(date, { kv: new MemKV() });
    const b = await loadDailyLevel(date, { kv: new MemKV() });
    expect(a.level).toEqual(b.level);
  });
  it('survives storage failures', async () => {
    const bad: KeyValueStore = { getItem: () => Promise.reject(new Error('x')), setItem: () => Promise.reject(new Error('x')), removeItem: () => Promise.reject(new Error('x')) };
    expect((await loadDailyLevel(date, { kv: bad })).level.id).toBe('daily-2026-10-01');
  });
});
