import { ALL_COLORS } from './types';
import type { GameState, Level, LiquidColor, Session, TubeState } from './types';

const VERSION = 1;

export function serializeSession(session: Session): string {
  return JSON.stringify({
    v: VERSION,
    levelId: session.level.id,
    initial: session.initial,
    history: session.history,
    current: session.current,
    undosUsed: session.undosUsed,
    hintsUsed: session.hintsUsed,
    extraTubeUsed: session.extraTubeUsed,
    startedAt: session.startedAt,
    elapsedMs: session.elapsedMs,
  });
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isCount = (v: unknown): v is number => isNum(v) && Number.isInteger(v) && v >= 0;

function parseTube(v: unknown): TubeState | null {
  if (!isObj(v)) return null;
  const { id, capacity, liquids, locked, sealed, catalystSpent, isExtra } = v;
  if (typeof id !== 'string' || !isCount(capacity) || capacity < 1) return null;
  if (!Array.isArray(liquids) || liquids.length > capacity) return null;
  if (typeof locked !== 'boolean' || typeof sealed !== 'boolean') return null;
  if (typeof catalystSpent !== 'boolean' || typeof isExtra !== 'boolean') return null;
  const layers = [];
  for (const l of liquids) {
    if (!isObj(l) || !ALL_COLORS.includes(l.color as LiquidColor)) return null;
    if (l.frozen !== undefined && typeof l.frozen !== 'boolean') return null;
    if (l.hidden !== undefined && typeof l.hidden !== 'boolean') return null;
    layers.push({
      color: l.color as LiquidColor,
      ...(l.frozen ? { frozen: true } : {}),
      ...(l.hidden ? { hidden: true } : {}),
    });
  }
  return { id, capacity, liquids: layers, locked, sealed, catalystSpent, isExtra };
}

function parseState(v: unknown, levelId: string): GameState | null {
  if (!isObj(v) || v.levelId !== levelId || !isCount(v.moves) || !Array.isArray(v.tubes)) return null;
  const tubes: TubeState[] = [];
  for (const t of v.tubes) {
    const tube = parseTube(t);
    if (!tube) return null;
    tubes.push(tube);
  }
  return { levelId, tubes, moves: v.moves };
}

/** Units per colour; identical across every snapshot of a session. */
function colorCounts(state: GameState): string {
  const counts: Record<string, number> = {};
  for (const t of state.tubes) for (const l of t.liquids) counts[l.color] = (counts[l.color] ?? 0) + 1;
  return JSON.stringify(Object.keys(counts).sort().map((c) => [c, counts[c]]));
}

/** Rebuild a session from JSON. Null if the data is malformed or inconsistent, or the level is gone. */
export function deserializeSession(json: string, levels: readonly Level[]): Session | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isObj(raw) || raw.v !== VERSION || typeof raw.levelId !== 'string') return null;
  const level = levels.find((l) => l.id === raw.levelId);
  if (!level) return null;

  const initial = parseState(raw.initial, level.id);
  const current = parseState(raw.current, level.id);
  if (!initial || !current || !Array.isArray(raw.history)) return null;
  const history: GameState[] = [];
  for (const h of raw.history) {
    const s = parseState(h, level.id);
    if (!s) return null;
    history.push(s);
  }
  if (!isCount(raw.undosUsed) || !isCount(raw.hintsUsed)) return null;
  if (typeof raw.extraTubeUsed !== 'boolean') return null;
  if (!isNum(raw.startedAt) || !isNum(raw.elapsedMs) || raw.elapsedMs < 0) return null;

  // Every snapshot must hold the same liquid as the level defines, in the same tubes.
  const expected = colorCounts(initial);
  const tubeCount = initial.tubes.length;
  for (const s of [...history, current]) {
    if (colorCounts(s) !== expected || s.tubes.length !== tubeCount) return null;
  }
  const baseTubes = initial.tubes.filter((t) => !t.isExtra);
  if (baseTubes.length !== level.tubes.length) return null;
  if (!baseTubes.every((t, i) => t.id === level.tubes[i].id && t.capacity === level.tubes[i].capacity)) return null;
  if (initial.tubes.filter((t) => t.isExtra).length !== (raw.extraTubeUsed ? 1 : 0)) return null;
  if (initial.moves !== 0 || history.some((s, i) => s.moves !== i) || current.moves !== history.length) return null;

  return {
    level,
    initial,
    history,
    current,
    undosUsed: raw.undosUsed,
    hintsUsed: raw.hintsUsed,
    extraTubeUsed: raw.extraTubeUsed,
    startedAt: raw.startedAt,
    elapsedMs: raw.elapsedMs,
  };
}
