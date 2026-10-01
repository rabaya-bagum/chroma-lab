import { isMixPour, mixResult } from './mixing';
import type { GameState, LiquidLayer, Move, MoveError, TubeState } from './types';

function tubeAt(state: GameState, index: number): TubeState {
  const tube = state.tubes[index];
  if (!tube) throw new RangeError(`No tube at index ${index}`);
  return tube;
}

function top(tube: TubeState): LiquidLayer | undefined {
  return tube.liquids[tube.liquids.length - 1];
}

/** A tube is complete when full, single-coloured, with no frozen or hidden layer. */
export function isTubeComplete(tube: TubeState): boolean {
  const { liquids, capacity } = tube;
  if (liquids.length === 0 || liquids.length !== capacity) return false;
  const color = liquids[0].color;
  return liquids.every((l) => l.color === color && !l.frozen && !l.hidden);
}

/** Why a pour from `from` to `to` is illegal, or null if it is legal (§5.1). */
export function getMoveError(state: GameState, from: number, to: number): MoveError | null {
  if (from === to) return 'sameTube';
  const a = tubeAt(state, from);
  const b = tubeAt(state, to);
  if (a.liquids.length === 0) return 'sourceEmpty';
  if (a.locked) return 'sourceLocked';
  if (a.sealed) return 'sourceSealed';
  const aTop = top(a)!;
  if (aTop.frozen) return 'sourceFrozenTop';
  if (b.locked) return 'destLocked';
  if (b.liquids.length >= b.capacity) return 'destFull';
  const bTop = top(b);
  if (bTop) {
    if (bTop.frozen) return 'destFrozenTop';
    if (bTop.color !== aTop.color && !mixResult(state.mix, aTop.color, bTop.color)) return 'colorMismatch';
  }
  return null;
}

export function isValidMove(state: GameState, from: number, to: number): boolean {
  return getMoveError(state, from, to) === null;
}

/** Length of the pourable run at the top of a tube (stops at colour change, frozen or hidden). */
export function topRunLength(tube: TubeState): number {
  const t = top(tube);
  if (!t || t.frozen || t.hidden) return 0;
  let n = 0;
  for (let i = tube.liquids.length - 1; i >= 0; i--) {
    const l = tube.liquids[i];
    if (l.color !== t.color || l.frozen || l.hidden) break;
    n++;
  }
  return n;
}

/** Units a pour would transfer (§5.2); 0 if the move is invalid. */
export function getPourAmount(state: GameState, from: number, to: number): number {
  if (getMoveError(state, from, to) !== null) return 0;
  const a = state.tubes[from];
  const b = state.tubes[to];
  if (isMixPour(state, from, to)) return 1;
  return Math.min(topRunLength(a), b.capacity - b.liquids.length);
}

/**
 * A valid move that only relabels a tube: the source's whole content goes into an
 * empty tube. It never changes the puzzle, so the solver and deadlock check skip it.
 */
export function isPointlessMove(state: GameState, from: number, to: number): boolean {
  const a = state.tubes[from];
  const b = state.tubes[to];
  if (isMixPour(state, from, to)) return false;
  return b.liquids.length === 0 && topRunLength(a) === a.liquids.length;
}

export function getValidMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  for (let from = 0; from < state.tubes.length; from++) {
    for (let to = 0; to < state.tubes.length; to++) {
      if (isValidMove(state, from, to)) moves.push({ from, to });
    }
  }
  return moves;
}

/** Solved: every tube empty or complete, and no locked tube still holds liquid (§5.3). */
export function isPuzzleSolved(state: GameState): boolean {
  return state.tubes.every((t) =>
    t.liquids.length === 0 ? true : !t.locked && isTubeComplete(t),
  );
}

/** Moves that actually change the puzzle (valid and not merely relabelling a tube). */
export function getMeaningfulMoves(state: GameState): Move[] {
  return getValidMoves(state).filter((m) => !isPointlessMove(state, m.from, m.to));
}

/**
 * No move can make progress and the puzzle is not solved (§5.6). Pointless
 * relabelling moves do not count, otherwise a stuck board with a spare empty
 * tube would never be reported.
 */
export function isDeadlocked(state: GameState): boolean {
  return !isPuzzleSolved(state) && getMeaningfulMoves(state).length === 0;
}
