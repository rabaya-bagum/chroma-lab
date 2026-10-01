import { DAILY_POOL } from '../data/daily.pool';
import { createDailyGenerator, DAILY_MAX_ATTEMPTS, levelFromPool } from '../game/daily';
import { GENERATOR_VERSION } from '../game/generator';
import { defineLevel, tubeToString } from '../game/levelCodec';
import type { Level } from '../game/types';
import type { KeyValueStore } from './storage';

export const DAILY_CACHE_KEY = 'chroma.daily';
const SLICE_MS = 8;

export type DailySource = 'cache' | 'generated' | 'pool';
export interface DailyLoad { level: Level; source: DailySource }

interface CacheEntry {
  dateKey: string;
  generatorVersion: string;
  difficulty: Level['difficulty'];
  optimalMoves: number;
  optimalIsExact: boolean;
  seed: string;
  tubes: string[];
}

export const toCache = (dateKey: string, level: Level): CacheEntry => ({
  dateKey,
  generatorVersion: GENERATOR_VERSION,
  difficulty: level.difficulty,
  optimalMoves: level.optimalMoves,
  optimalIsExact: level.optimalIsExact,
  seed: level.meta.seed,
  tubes: level.tubes.map(tubeToString),
});

export function fromCache(raw: unknown, dateKey: string): Level | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const e = raw as Partial<CacheEntry>;
  if (e.dateKey !== dateKey || e.generatorVersion !== GENERATOR_VERSION) return null;
  if (!Array.isArray(e.tubes) || !e.tubes.every((t) => typeof t === 'string')) return null;
  if (typeof e.optimalMoves !== 'number' || typeof e.seed !== 'string') return null;
  if (!['easy', 'medium', 'hard', 'expert'].includes(e.difficulty as string)) return null;
  try {
    return defineLevel({
      id: `daily-${dateKey}`, number: 0, chapter: 0, difficulty: e.difficulty!,
      optimalMoves: e.optimalMoves, optimalIsExact: !!e.optimalIsExact, tubes: e.tubes,
      meta: { generatorVersion: GENERATOR_VERSION, seed: e.seed },
    });
  } catch {
    return null;
  }
}

export interface DailyDeps {
  kv: KeyValueStore;
  now?: () => number;
  /** Resolves on the next frame; generation yields between slices. */
  nextFrame?: () => Promise<void>;
  /** Test hook: force the attempt budget (0 forces the fallback pool). */
  maxAttempts?: number;
}

const defaultFrame = () =>
  new Promise<void>((r) => { if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => r()); else setTimeout(r, 0); });

/** The saved daily level for `dateKey`, if there is one (no generation). */
export async function loadCachedDaily(kv: KeyValueStore, dateKey: string): Promise<Level | null> {
  try {
    const raw = await kv.getItem(DAILY_CACHE_KEY);
    return raw ? fromCache(JSON.parse(raw), dateKey) : null;
  } catch {
    return null;
  }
}

/**
 * Today's puzzle: the cached copy if there is one, otherwise generated on the
 * device in slices of at most 8 ms with a frame between them (so the screen's
 * "Synthesising" state stays animated), otherwise taken from the shipped pool.
 * The result is cached per date (§12.4).
 */
export async function loadDailyLevel(dateKey: string, deps: DailyDeps): Promise<DailyLoad> {
  const cached = await loadCachedDaily(deps.kv, dateKey);
  if (cached) return { level: cached, source: 'cache' };

  const now = deps.now ?? (() => Date.now());
  const nextFrame = deps.nextFrame ?? defaultFrame;
  const cap = deps.maxAttempts ?? DAILY_MAX_ATTEMPTS;
  const gen = createDailyGenerator(dateKey);
  let level: Level | null = null;
  while (!level && gen.attempts < cap) {
    const sliceStart = now();
    do {
      const r = gen.tryNext();
      if (r?.level.optimalIsExact) { level = r.level; break; }
    } while (gen.attempts < cap && now() - sliceStart < SLICE_MS);
    if (!level && gen.attempts < cap) await nextFrame();
  }

  const source: DailySource = level ? 'generated' : 'pool';
  const result = level ?? levelFromPool(DAILY_POOL, dateKey);
  try { await deps.kv.setItem(DAILY_CACHE_KEY, JSON.stringify(toCache(dateKey, result))); } catch { /* cache is optional */ }
  return { level: result, source };
}
