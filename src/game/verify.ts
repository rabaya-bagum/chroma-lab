import { levelCanonicalKey } from './canonical';
import { applyMove, createSession } from './session';
import { isPuzzleSolved } from './rules';
import { solveLevel } from './solver';
import type { Level } from './types';

/** Problems found with a shipped level; an empty array means it is good. */
export function verifyLevel(level: Level): string[] {
  const problems: string[] = [];
  const res = solveLevel(level);
  if (res.solvable !== true || !res.solution) {
    problems.push(`${level.id}: not solvable (${String(res.solvable)})`);
    return problems;
  }
  if (res.optimal !== level.optimalMoves) {
    problems.push(`${level.id}: optimalMoves ${level.optimalMoves} but solver found ${res.optimal}`);
  }
  if (res.exact !== level.optimalIsExact) {
    problems.push(`${level.id}: optimalIsExact ${level.optimalIsExact} but solver exact=${res.exact}`);
  }
  // Replay through the real engine.
  let session = createSession(level);
  for (const m of res.solution) {
    const r = applyMove(session, m);
    if (r.events.length === 0) { problems.push(`${level.id}: solver move ${m.from}->${m.to} rejected by engine`); return problems; }
    session = r.session;
  }
  if (!isPuzzleSolved(session.current)) problems.push(`${level.id}: replay did not solve the puzzle`);
  if (session.current.moves !== level.optimalMoves) problems.push(`${level.id}: replay took ${session.current.moves} moves`);
  return problems;
}

/** Cross-level checks: unique ids and numbers, no duplicate layouts. */
export function verifyLevelSet(levels: readonly Level[]): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const keys = new Map<string, string>();
  levels.forEach((l, i) => {
    if (ids.has(l.id)) problems.push(`${l.id}: duplicate id`);
    ids.add(l.id);
    if (l.number !== i + 1) problems.push(`${l.id}: expected number ${i + 1}, got ${l.number}`);
    const key = levelCanonicalKey(l);
    const other = keys.get(key);
    if (other) problems.push(`${l.id}: duplicate of ${other}`);
    keys.set(key, l.id);
  });
  return problems;
}
