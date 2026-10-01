import { CURRENT_VERSION } from '../game/save';

/**
 * Ordered migrations: entry i upgrades a save from version i to version i + 1.
 * Version 1 is the first shipped format, so the list is empty for now.
 */
export type Migration = (from: Record<string, unknown>) => Record<string, unknown>;
export const MIGRATIONS: readonly Migration[] = [];

export type MigrateResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; reason: 'notObject' | 'noVersion' | 'tooNew' | 'failed' };

/** Run every migration from the stored version up to `current`. */
export function migrate(
  raw: unknown,
  migrations: readonly Migration[] = MIGRATIONS,
  current: number = CURRENT_VERSION,
): MigrateResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { ok: false, reason: 'notObject' };
  let data = raw as Record<string, unknown>;
  const v = data.version;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1) return { ok: false, reason: 'noVersion' };
  if (v > current) return { ok: false, reason: 'tooNew' };
  try {
    for (let from = v; from < current; from++) {
      const step = migrations[from - 1];
      if (!step) return { ok: false, reason: 'failed' };
      data = { ...step(data), version: from + 1 };
    }
  } catch {
    return { ok: false, reason: 'failed' };
  }
  return { ok: true, data };
}
