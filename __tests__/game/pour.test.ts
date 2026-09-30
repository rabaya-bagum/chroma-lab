import { pourLiquid } from '../../src/game/pour';
import { makeLevel, stateOf } from '../helpers';

const run = (rows: string[], from: number, to: number) => {
  const level = makeLevel(rows);
  const state = stateOf(rows);
  return pourLiquid(level, state, from, to);
};

describe('pourLiquid', () => {
  it('transfers the run and emits a poured event', () => {
    const { state, events } = run(['BRR', 'R', ''], 0, 1);
    expect(state.tubes[0].liquids.map((l) => l.color)).toEqual(['blue']);
    expect(state.tubes[1].liquids.map((l) => l.color)).toEqual(['red', 'red', 'red']);
    expect(state.moves).toBe(1);
    expect(events).toEqual([{ type: 'poured', from: 0, to: 1, color: 'red', amount: 2 }]);
  });
  it('splits a run when the destination is nearly full', () => {
    const { state, events } = run(['BRR', 'RRR'], 0, 1);
    expect(events[0]).toMatchObject({ amount: 1 });
    expect(state.tubes[0].liquids).toHaveLength(2);
  });
  it('does not mutate the input state', () => {
    const level = makeLevel(['BR', '']);
    const before = stateOf(['BR', '']);
    const snapshot = JSON.stringify(before);
    pourLiquid(level, before, 0, 1);
    expect(JSON.stringify(before)).toBe(snapshot);
  });
  it('returns the same state and no events for an invalid move', () => {
    const level = makeLevel(['R', 'B']);
    const s = stateOf(['R', 'B']);
    const r = pourLiquid(level, s, 0, 1);
    expect(r.state).toBe(s);
    expect(r.events).toEqual([]);
  });
  it('emits tubeCompleted after poured when the destination fills', () => {
    const { state, events } = run(['BRRR', 'R', ''], 0, 1);
    expect(events).toEqual([
      { type: 'poured', from: 0, to: 1, color: 'red', amount: 3 },
      { type: 'tubeCompleted', tube: 1, color: 'red' },
    ]);
    expect(state.tubes[1].sealed).toBe(true);
  });
  it('does not seal a tube that is not full', () => {
    const { state, events } = run(['BRR', 'R', ''], 0, 1);
    expect(events.map((e) => e.type)).toEqual(['poured']);
    expect(state.tubes[1].sealed).toBe(false);
  });
  it('seals the destination when it fills with one colour', () => {
    const { state, events } = run(['BR', 'RRR'], 0, 1);
    expect(events.map((e) => e.type)).toEqual(['poured', 'tubeCompleted']);
    expect(state.tubes[1].sealed).toBe(true);
  });
  it('emits solved last when the final tube completes', () => {
    const { events } = run(['BR', 'RRR', 'BBB'], 0, 1);
    expect(events.map((e) => e.type)).toEqual(['poured', 'tubeCompleted']);
    const r2 = pourLiquid(makeLevel(['B', 'RRRR', 'BBB']), stateOf(['B', 'RRRR', 'BBB']), 0, 2);
    expect(r2.events.map((e) => e.type)).toEqual(['poured', 'tubeCompleted', 'solved']);
  });
  it('a sealed tube can no longer be poured from', () => {
    const { state } = run(['BR', 'RRR', ''], 0, 1);
    expect(pourLiquid(makeLevel(['BR', 'RRR', '']), state, 1, 2).events).toEqual([]);
  });
});
