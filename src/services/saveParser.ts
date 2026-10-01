import { DEFAULT_SETTINGS, defaultSave, recomputeDerived } from '../game/save';
import type { LevelRecord, SaveDataV1 } from '../game/save';
import type { Level } from '../game/types';
import { migrate } from './migrations';
import type { Migration } from './migrations';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const count = (v: unknown, d = 0): number => (typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : d);
const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/**
 * Validate a stored save, filling any missing optional field from defaults.
 * Returns null if the structure is unusable. Derived values are recomputed.
 */
export function parseSave(raw: unknown, levels: readonly Level[], migrations?: readonly Migration[]): SaveDataV1 | null {
  const m = migrate(raw, migrations);
  if (!m.ok) return null;
  const d = m.data;
  const base = defaultSave();
  if (!isObj(d.progress) || !isObj(d.economy)) return null;

  const levelRecords: Record<string, LevelRecord> = {};
  if (d.progress.levels !== undefined) {
    if (!isObj(d.progress.levels)) return null;
    for (const [id, r] of Object.entries(d.progress.levels)) {
      if (!isObj(r)) return null;
      const stars = r.stars;
      if (stars !== 0 && stars !== 1 && stars !== 2 && stars !== 3) return null;
      const rec: LevelRecord = { stars, completions: count(r.completions) };
      if (r.bestMoves !== undefined) rec.bestMoves = count(r.bestMoves, 0) || undefined;
      levelRecords[id] = rec;
    }
  }
  if (typeof d.economy.coins !== 'number' || !Number.isFinite(d.economy.coins)) return null;

  const achievements: SaveDataV1['progress']['achievements'] = {};
  if (isObj(d.progress.achievements)) {
    for (const [id, a] of Object.entries(d.progress.achievements)) {
      if (isObj(a) && typeof a.unlockedAt === 'number') achievements[id] = { unlockedAt: a.unlockedAt };
    }
  }
  const stats = isObj(d.progress.stats) ? d.progress.stats : {};
  const cos = isObj(d.cosmetics) ? d.cosmetics : {};
  const sel = isObj(cos.selected) ? cos.selected : {};
  const daily = isObj(d.daily) ? d.daily : {};
  const history: SaveDataV1['daily']['history'] = {};
  if (isObj(daily.history)) {
    for (const [k, v] of Object.entries(daily.history)) {
      if (isObj(v) && typeof v.moves === 'number' && typeof v.timeMs === 'number') history[k] = { moves: v.moves, timeMs: v.timeMs };
    }
  }
  const s = isObj(d.settings) ? d.settings : {};
  const rm = s.reduceMotion;

  const parsed: SaveDataV1 = {
    version: 1,
    progress: {
      levels: levelRecords,
      highestUnlocked: base.progress.highestUnlocked,
      starsTotal: 0,
      researchXp: 0,
      labUnlocked: strList(d.progress.labUnlocked),
      achievements,
      stats: { levelsCompleted: 0, undos: count(stats.undos), hints: count(stats.hints) },
      tutorialDone: bool(d.progress.tutorialDone, false),
    },
    economy: { coins: Math.max(0, Math.floor(d.economy.coins)) },
    cosmetics: {
      owned: strList(cos.owned).length ? strList(cos.owned) : base.cosmetics.owned,
      selected: {
        tube: typeof sel.tube === 'string' ? sel.tube : base.cosmetics.selected.tube,
        theme: typeof sel.theme === 'string' ? sel.theme : base.cosmetics.selected.theme,
        pour: typeof sel.pour === 'string' ? sel.pour : base.cosmetics.selected.pour,
      },
    },
    daily: { history, streak: count(daily.streak), ...(typeof daily.lastDate === 'string' ? { lastDate: daily.lastDate } : {}) },
    settings: {
      music: bool(s.music, DEFAULT_SETTINGS.music),
      sound: bool(s.sound, DEFAULT_SETTINGS.sound),
      haptics: bool(s.haptics, DEFAULT_SETTINGS.haptics),
      colorBlind: bool(s.colorBlind, DEFAULT_SETTINGS.colorBlind),
      patterns: bool(s.patterns, DEFAULT_SETTINGS.patterns),
      labels: bool(s.labels, DEFAULT_SETTINGS.labels),
      highContrast: bool(s.highContrast, DEFAULT_SETTINGS.highContrast),
      reduceMotion: rm === 'on' || rm === 'off' || rm === 'system' ? rm : DEFAULT_SETTINGS.reduceMotion,
    },
  };
  return recomputeDerived(parsed, levels);
}

