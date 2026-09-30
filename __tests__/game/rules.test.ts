import { getMoveError, getPourAmount, getValidMoves, isDeadlocked, isPuzzleSolved, isTubeComplete, isValidMove } from '../../src/game/rules';
import { createInitialState } from '../../src/game/session';
import { makeLevel, stateOf } from '../helpers';
import type { GameState } from '../../src/game/types';

describe('getMoveError', () => {
  it('rejects same tube', () => expect(getMoveError(stateOf(['RB', '']), 0, 0)).toBe('sameTube'));
  it('rejects empty source', () => expect(getMoveError(stateOf(['RB', '']), 1, 0)).toBe('sourceEmpty'));
  it('rejects locked source and destination', () => {
    const s = stateOf(['RB', 'R', '']);
    const locked: GameState = { ...s, tubes: s.tubes.map((t, i) => (i === 0 ? { ...t, locked: true } : t)) };
    expect(getMoveError(locked, 0, 2)).toBe('sourceLocked');
    const lockedDest: GameState = { ...s, tubes: s.tubes.map((t, i) => (i === 2 ? { ...t, locked: true } : t)) };
    expect(getMoveError(lockedDest, 1, 2)).toBe('destLocked');
  });
  it('rejects sealed source', () => {
    const s = stateOf(['RRRR', '']);
    expect(s.tubes[0].sealed).toBe(true);
    expect(getMoveError(s, 0, 1)).toBe('sourceSealed');
  });
  it('rejects frozen tops', () => {
    const s = stateOf(['BR', 'R', '']);
    const frozenTop = (i: number): GameState => ({
      ...s,
      tubes: s.tubes.map((t, j) => (j === i ? { ...t, liquids: t.liquids.map((l, k) => (k === t.liquids.length - 1 ? { ...l, frozen: true } : l)) } : t)),
    });
    expect(getMoveError(frozenTop(0), 0, 2)).toBe('sourceFrozenTop');
    expect(getMoveError(frozenTop(1), 0, 1)).toBe('destFrozenTop');
  });
  it('rejects a full destination', () => expect(getMoveError(stateOf(['R', 'RBBR']), 0, 1)).toBe('destFull'));
  it('rejects a colour mismatch', () => expect(getMoveError(stateOf(['R', 'B']), 0, 1)).toBe('colorMismatch'));
  it('accepts a matching colour and an empty destination', () => {
    const s = stateOf(['BR', 'R', '']);
    expect(getMoveError(s, 0, 1)).toBeNull();
    expect(isValidMove(s, 0, 2)).toBe(true);
  });
  it('throws on an out-of-range index', () => expect(() => getMoveError(stateOf(['R']), 0, 5)).toThrow(RangeError));
});

describe('getPourAmount', () => {
  it('moves the whole top run', () => expect(getPourAmount(stateOf(['BRR', 'R', '']), 0, 1)).toBe(2));
  it('is capped by free space', () => expect(getPourAmount(stateOf(['BRR', 'RRR']), 0, 1)).toBe(1));
  it('stops at a different colour', () => expect(getPourAmount(stateOf(['RBR', '']), 0, 1)).toBe(1));
  it('stops at frozen or hidden layers', () => {
    const s = stateOf(['RRR', '']);
    const frozen: GameState = { ...s, tubes: s.tubes.map((t, i) => (i === 0 ? { ...t, liquids: t.liquids.map((l, k) => (k === 0 ? { ...l, frozen: true } : l)) } : t)) };
    expect(getPourAmount(frozen, 0, 1)).toBe(2);
    const hidden: GameState = { ...s, tubes: s.tubes.map((t, i) => (i === 0 ? { ...t, liquids: t.liquids.map((l, k) => (k === 1 ? { ...l, hidden: true } : l)) } : t)) };
    expect(getPourAmount(hidden, 0, 1)).toBe(1);
  });
  it('is 0 for an invalid move', () => expect(getPourAmount(stateOf(['R', 'B']), 0, 1)).toBe(0));
  it('reads capacity instead of assuming 4', () => {
    const level = makeLevel(['RRR', 'R', '']);
    level.tubes[1].capacity = 6;
    level.tubes[2].capacity = 6;
    expect(getPourAmount(createInitialState(level), 0, 1)).toBe(3);
  });
});

describe('completion, solved and deadlock', () => {
  it('isTubeComplete needs a full single-colour tube', () => {
    const t = stateOf(['RRRR', 'RRR', 'RRBR', '']).tubes;
    expect(isTubeComplete(t[0])).toBe(true);
    expect(isTubeComplete(t[1])).toBe(false);
    expect(isTubeComplete(t[2])).toBe(false);
    expect(isTubeComplete(t[3])).toBe(false);
  });
  it('isPuzzleSolved', () => {
    expect(isPuzzleSolved(stateOf(['RRRR', 'BBBB', '', ''])) ).toBe(true);
    expect(isPuzzleSolved(stateOf(['RRRR', 'BBB', 'B', ''])) ).toBe(false);
  });
  it('a locked tube holding liquid blocks the solve', () => {
    const s = stateOf(['RRRR', '']);
    const locked: GameState = { ...s, tubes: s.tubes.map((t, i) => (i === 0 ? { ...t, locked: true } : t)) };
    expect(isPuzzleSolved(locked)).toBe(false);
  });
  it('isDeadlocked is true when no tube can pour anywhere', () => {
    expect(isDeadlocked(stateOf(['RRRB', 'BBBR']))).toBe(true);
    expect(isDeadlocked(stateOf(['RBRB', 'BRBR', 'GGGG']))).toBe(true);
  });
  it('isDeadlocked is false when a move exists or the puzzle is solved', () => {
    expect(isDeadlocked(stateOf(['RRBB', 'BBRR', 'GGGG', '']))).toBe(false);
    expect(isDeadlocked(stateOf(['RRRR', 'BBBB']))).toBe(false);
  });
  it('relabelling moves into a spare empty tube do not hide a deadlock', () => {
    const s = stateOf(['RR', 'BB', '']);
    expect(getValidMoves(s)).toHaveLength(2);
    expect(isDeadlocked(s)).toBe(true);
  });
});
