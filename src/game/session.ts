import { pourLiquid } from './pour';
import { isTubeComplete } from './rules';
import { DEFAULT_CAPACITY } from './types';
import type { GameEvent, GameState, Level, Move, Session, TubeState } from './types';

export const EXTRA_TUBE_ID = 'X1';

export function createInitialState(level: Level): GameState {
  const tubes: TubeState[] = level.tubes.map((def) => {
    const liquids = def.liquids.map((l) => ({ ...l }));
    const tube: TubeState = {
      id: def.id,
      capacity: def.capacity,
      liquids,
      locked: !!def.lock,
      sealed: false,
      catalystSpent: false,
      isExtra: false,
    };
    return { ...tube, sealed: !tube.locked && isTubeComplete(tube) };
  });
  const pairs = level.rules?.mixing?.pairs;
  return {
    levelId: level.id,
    tubes: tubes.map(revealTop),
    moves: 0,
    ...(pairs ? { mix: pairs.map((p) => ({ ...p })) } : {}),
  };
}

/** A hidden layer is never on top (§5.1): a board that starts with one on top shows its true colour. */
function revealTop(t: TubeState): TubeState {
  const k = t.liquids.length - 1;
  if (k < 0 || !t.liquids[k].hidden) return t;
  const { hidden: _h, ...rest } = t.liquids[k];
  return { ...t, liquids: t.liquids.map((l, j) => (j === k ? rest : l)) };
}

export function createSession(level: Level, now = 0): Session {
  const initial = createInitialState(level);
  return {
    level,
    initial,
    history: [],
    current: initial,
    undosUsed: 0,
    hintsUsed: 0,
    extraTubeUsed: false,
    startedAt: now,
    elapsedMs: 0,
  };
}

/** Apply a move. An invalid move returns the session unchanged with no events. */
export function applyMove(
  session: Session,
  move: Move,
): { session: Session; events: GameEvent[] } {
  const { state, events } = pourLiquid(session.level, session.current, move.from, move.to);
  if (events.length === 0) return { session, events };
  return {
    session: { ...session, history: [...session.history, session.current], current: state },
    events,
  };
}

/** Restore the previous snapshot (including move count). Null if nothing to undo. */
export function undoMove(session: Session): Session | null {
  if (session.history.length === 0) return null;
  const history = session.history.slice(0, -1);
  return {
    ...session,
    history,
    current: session.history[session.history.length - 1],
    undosUsed: session.undosUsed + 1,
  };
}

/**
 * Reset tubes, moves, history and the timer (§8.2). A purchased extra tube stays
 * (it lives in `initial`), and undo/hint counters are kept.
 */
export function restartLevel(session: Session, now = session.startedAt): Session {
  return {
    ...session,
    history: [],
    current: session.initial,
    startedAt: now,
    elapsedMs: 0,
  };
}

function withExtraTube(state: GameState): GameState {
  const extra: TubeState = {
    id: EXTRA_TUBE_ID,
    capacity: DEFAULT_CAPACITY,
    liquids: [],
    locked: false,
    sealed: false,
    catalystSpent: false,
    isExtra: true,
  };
  return { ...state, tubes: [...state.tubes, extra] };
}

/**
 * Add one empty tube, once per level visit (§8.3). The tube is added to every
 * snapshot so that undo and restart never remove a tube the player paid for.
 */
export function addExtraTube(session: Session): Session {
  if (session.extraTubeUsed) return session;
  return {
    ...session,
    initial: withExtraTube(session.initial),
    history: session.history.map(withExtraTube),
    current: withExtraTube(session.current),
    extraTubeUsed: true,
  };
}

/** Add play time (ms) to the session; the caller excludes backgrounded time. */
export function addElapsed(session: Session, deltaMs: number): Session {
  return deltaMs > 0 ? { ...session, elapsedMs: session.elapsedMs + deltaMs } : session;
}
