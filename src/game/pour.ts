import { getMoveError, isTubeComplete, isPuzzleSolved, topRunLength } from './rules';
import type { GameEvent, GameState, Level, TubeState } from './types';

/**
 * Apply one pour and return the new state plus events in §5.5 order.
 * An invalid move returns the same state and no events.
 *
 * Phase 1 implements the classic rules: transfer, completion/sealing, solved.
 * Reveal, catalyst and unlock/thaw conditions slot into `settle` in Phase 5;
 * `level` is already threaded through for them.
 */
export function pourLiquid(
  level: Level,
  state: GameState,
  from: number,
  to: number,
): { state: GameState; events: GameEvent[] } {
  if (getMoveError(state, from, to) !== null) return { state, events: [] };

  const src = state.tubes[from];
  const dst = state.tubes[to];
  const amount = Math.min(topRunLength(src), dst.capacity - dst.liquids.length);
  const color = src.liquids[src.liquids.length - 1].color;

  const tubes: TubeState[] = state.tubes.slice();
  tubes[from] = { ...src, liquids: src.liquids.slice(0, src.liquids.length - amount) };
  tubes[to] = { ...dst, liquids: dst.liquids.concat(src.liquids.slice(src.liquids.length - amount)) };

  const events: GameEvent[] = [{ type: 'poured', from, to, color, amount }];
  let next: GameState = { ...state, tubes, moves: state.moves + 1 };
  next = settle(level, next, events);
  return { state: next, events };
}

/** Steps 2-6 of §5.5, repeated until nothing changes. */
function settle(_level: Level, state: GameState, events: GameEvent[]): GameState {
  let tubes = state.tubes;
  let changed = true;
  // Bounded: each pass seals at least one more tube or stops.
  while (changed) {
    changed = false;
    tubes = tubes.map((t, i) => {
      if (!t.sealed && isTubeComplete(t)) {
        changed = true;
        events.push({ type: 'tubeCompleted', tube: i, color: t.liquids[0].color });
        return { ...t, sealed: true };
      }
      return t;
    });
  }
  const next = tubes === state.tubes ? state : { ...state, tubes };
  if (isPuzzleSolved(next)) events.push({ type: 'solved' });
  return next;
}
