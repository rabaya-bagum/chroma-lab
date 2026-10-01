import { makeLevel } from '../helpers';
import { RBY_PAIRS } from '../../src/game/mixing';
import { pourLiquid } from '../../src/game/pour';
import { getMoveError } from '../../src/game/rules';
import { applyMove, createInitialState, createSession, undoMove } from '../../src/game/session';
import { deserializeSession, serializeSession } from '../../src/game/serialize';
import type { Level } from '../../src/game/types';

const ALL = [RBY_PAIRS.violet, RBY_PAIRS.green, RBY_PAIRS.orange];

function mixLevel(rows: string[], pairs = ALL): Level {
  const level = makeLevel(rows);
  return { ...level, rules: { mixing: { pairs } } };
}
const colours = (s: ReturnType<typeof createInitialState>, i: number) => s.tubes[i].liquids.map((l) => l.color);

describe('colour mixing', () => {
  it.each([
    ['R', 'B', 'purple'], ['B', 'R', 'purple'],
    ['B', 'Y', 'green'], ['Y', 'B', 'green'],
    ['R', 'Y', 'orange'], ['Y', 'R', 'orange'],
  ])('pouring %s onto %s makes %s', (x, y, result) => {
    const level = mixLevel([`G${x}`, `V${y}`, '']);
    const { state, events } = pourLiquid(level, createInitialState(level), 0, 1);
    expect(colours(state, 0)).toEqual(['green']);
    expect(colours(state, 1)).toEqual(['purple', result, result]);
    expect(events.map((e) => e.type)).toEqual(['poured', 'mixed']);
    expect(events[0]).toMatchObject({ amount: 1 });
  });

  it('pours exactly one unit even from a longer run, and conserves volume', () => {
    const level = mixLevel(['RRR', 'BB', '']);
    const s0 = createInitialState(level);
    const { state } = pourLiquid(level, s0, 0, 1);
    expect(colours(state, 0)).toEqual(['red', 'red']);
    expect(colours(state, 1)).toEqual(['blue', 'purple', 'purple']);
    const total = (s: typeof s0) => s.tubes.reduce((n, t) => n + t.liquids.length, 0);
    expect(total(state)).toBe(total(s0));
    expect(state.moves).toBe(1);
  });

  it('needs room in the destination', () => {
    const level = mixLevel(['R', 'BBBB']);
    expect(getMoveError(createInitialState(level), 0, 1)).toBe('destFull');
  });

  it('leaves cyan, pink and mixed colours inert', () => {
    const level = mixLevel(['C', 'R', 'M', 'RB', 'V']);
    const s = createInitialState(level);
    expect(getMoveError(s, 0, 1)).toBe('colorMismatch');
    expect(getMoveError(s, 2, 1)).toBe('colorMismatch');
    expect(getMoveError(s, 4, 1)).toBe('colorMismatch'); // purple onto red
    expect(getMoveError(s, 1, 4)).toBe('colorMismatch');
  });

  it('only mixes enabled pairs, and never on levels without mixing', () => {
    const only = mixLevel(['R', 'B', 'Y'], [RBY_PAIRS.violet]);
    const s = createInitialState(only);
    expect(getMoveError(s, 0, 1)).toBeNull();
    expect(getMoveError(s, 1, 2)).toBe('colorMismatch');
    expect(getMoveError(createInitialState(makeLevel(['R', 'B'])), 0, 1)).toBe('colorMismatch');
  });

  it('does not mix with a frozen top', () => {
    const level = mixLevel(['R', 'B^']);
    expect(getMoveError(createInitialState(level), 0, 1)).toBe('destFrozenTop');
  });

  it('still pours same-colour as before', () => {
    const level = mixLevel(['RR', 'R', '']);
    const { state } = pourLiquid(level, createInitialState(level), 0, 1);
    expect(colours(state, 1)).toEqual(['red', 'red', 'red']);
  });

  it('a produced colour can trip a catalyst', () => {
    const level = mixLevel(['R', 'B', 'C']);
    level.tubes[1].catalyst = { triggerColor: 'purple', effect: { type: 'revealTube', tubeId: 'T3' } };
    level.tubes[2].liquids = [{ color: 'cyan', hidden: true }, { color: 'cyan' }];
    const { events } = pourLiquid(level, createInitialState(level), 0, 1);
    expect(events.some((e) => e.type === 'catalystActivated')).toBe(true);
  });

  it('undoes a mix and survives a save', () => {
    const level = mixLevel(['RR', 'BB', '']);
    let session = createSession(level);
    session = applyMove(session, { from: 0, to: 1 }).session;
    const restored = deserializeSession(serializeSession(session), [level]);
    expect(restored).not.toBeNull();
    expect(restored!.current.mix).toEqual(ALL);
    expect(colours(restored!.current, 1)).toEqual(['blue', 'purple', 'purple']);
    const back = undoMove(restored!);
    expect(colours(back!.current, 1)).toEqual(['blue', 'blue']);
  });
});
