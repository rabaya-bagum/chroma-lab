import { conditionProgress, describeCondition, describeProgress, isConditionMet } from '../../src/game/conditions';
import { defineLevel, tubeFromString, tubeToString } from '../../src/game/levelCodec';
import { pourLiquid } from '../../src/game/pour';
import { describeMechanics } from '../../src/game/mechanicsText';
import { reactorBonus, reactorMeter } from '../../src/game/reactor';
import { getMoveError, isDeadlocked, isPuzzleSolved } from '../../src/game/rules';
import { applyMove, createInitialState, createSession, undoMove } from '../../src/game/session';
import { deserializeSession, serializeSession } from '../../src/game/serialize';
import type { CompactTube } from '../../src/game/levelCodec';
import type { GameEvent, Level } from '../../src/game/types';

const mk = (tubes: CompactTube[], extra: Partial<Parameters<typeof defineLevel>[0]> = {}): Level =>
  defineLevel({
    id: 'M', number: 1, chapter: 3, difficulty: 'hard', optimalMoves: 1, optimalIsExact: true,
    tubes, meta: { generatorVersion: 't', seed: 't' }, ...extra,
  });
const types = (e: GameEvent[]) => e.map((x) => x.type);
const move = (level: Level, state: ReturnType<typeof createInitialState>, from: number, to: number) => pourLiquid(level, state, from, to);

describe('level codec with mechanics', () => {
  it('round-trips frozen and hidden marks', () => {
    const t = tubeFromString('T1', 'R^R?BG');
    expect(t.liquids).toEqual([{ color: 'red', frozen: true }, { color: 'red', hidden: true }, { color: 'blue' }, { color: 'green' }]);
    expect(tubeToString(t)).toBe('R^R?BG');
  });
  it('accepts tubes with per-tube rules', () => {
    const l = mk(['RB', { liquids: 'G', lock: { unlockWhen: { type: 'movesMade', count: 3 } } }, '']);
    expect(l.tubes[1].lock).toEqual({ unlockWhen: { type: 'movesMade', count: 3 } });
  });
});

describe('conditions', () => {
  const l = mk(['RRRB', 'B', '']);
  const s0 = createInitialState(l);
  it('movesMade counts moves', () => {
    const c = { type: 'movesMade', count: 2 } as const;
    expect(isConditionMet(c, s0)).toBe(false);
    expect(isConditionMet(c, { ...s0, moves: 2 })).toBe(true);
    expect(conditionProgress(c, { ...s0, moves: 1 })).toEqual({ current: 1, target: 2 });
    expect(describeProgress(c, { ...s0, moves: 1 })).toBe('1/2 moves');
    expect(describeCondition(c)).toBe('after 2 moves');
  });
  it('tubesCompleted and colorCompleted use sealed tubes', () => {
    const done = createInitialState(mk(['RRRR', 'BB', '']));
    expect(isConditionMet({ type: 'tubesCompleted', count: 1 }, done)).toBe(true);
    expect(isConditionMet({ type: 'tubesCompleted', count: 2 }, done)).toBe(false);
    expect(isConditionMet({ type: 'colorCompleted', color: 'red' }, done)).toBe(true);
    expect(isConditionMet({ type: 'colorCompleted', color: 'blue' }, done)).toBe(false);
    expect(describeProgress({ type: 'tubesCompleted', count: 2 }, done)).toBe('1/2 tubes');
  });
});

describe('locked tubes', () => {
  const lock = { type: 'movesMade', count: 2 } as const;
  const level = mk(['BRRR', 'R', '', { liquids: 'B', lock: { unlockWhen: lock } }, 'BBB'], { number: 2 });
  const s0 = createInitialState(level);
  it('starts locked and cannot be poured from or into', () => {
    expect(s0.tubes[3].locked).toBe(true);
    expect(getMoveError(s0, 3, 2)).toBe('sourceLocked');
    expect(getMoveError(s0, 0, 3)).toBe('destLocked');
  });
  it('unlocks when the condition is met and emits unlocked after poured', () => {
    const r1 = move(level, s0, 0, 1);
    expect(types(r1.events)).toEqual(['poured', 'tubeCompleted']);
    expect(r1.state.tubes[3].locked).toBe(true);
    const r2 = move(level, r1.state, 0, 2);
    expect(types(r2.events)).toEqual(['poured', 'unlocked']);
    expect(r2.state.tubes[3].locked).toBe(false);
    expect(getMoveError(r2.state, 3, 4)).toBeNull();
  });
  it('a locked tube holding liquid blocks the solve even when everything else is complete', () => {
    const l = mk(['RRRR', { liquids: 'B', lock: { unlockWhen: { type: 'movesMade', count: 9 } } }, 'BBB']);
    expect(isPuzzleSolved(createInitialState(l))).toBe(false);
  });
  it('a locked tube cannot seal while locked, and seals the moment it unlocks', () => {
    const l = mk([{ liquids: 'RRRR', lock: { unlockWhen: { type: 'tubesCompleted', count: 1 } } }, 'BBB', 'B', '']);
    const s = createInitialState(l);
    expect(s.tubes[0].sealed).toBe(false);
    const r = move(l, s, 2, 1);
    expect(types(r.events)).toEqual(['poured', 'tubeCompleted', 'unlocked', 'tubeCompleted', 'solved']);
    expect(r.state.tubes[0]).toMatchObject({ locked: false, sealed: true });
  });
  it('cascades: one unlock can complete a tube that satisfies the next condition', () => {
    const l = mk([
      { liquids: 'RRRR', lock: { unlockWhen: { type: 'tubesCompleted', count: 1 } } },
      { liquids: 'GGGG', lock: { unlockWhen: { type: 'colorCompleted', color: 'red' } } },
      'BBB', 'B', '',
    ]);
    const r = move(l, createInitialState(l), 3, 2);
    expect(types(r.events)).toEqual(['poured', 'tubeCompleted', 'unlocked', 'tubeCompleted', 'unlocked', 'tubeCompleted', 'solved']);
  });
});

describe('frozen liquid', () => {
  const thawWhen = { type: 'movesMade', count: 3 } as const;
  const level = mk([{ liquids: 'R^RB', thawWhen }, 'R', 'B', ''], { number: 3 });
  const s0 = createInitialState(level);
  it('liquid above frozen layers moves; frozen layers do not', () => {
    expect(getMoveError(s0, 0, 2)).toBeNull();
    const r = move(level, s0, 0, 2);
    // the red under it is not frozen but the bottom one is; top is now red (unfrozen), pourable
    expect(r.state.tubes[0].liquids.map((l) => !!l.frozen)).toEqual([true, false]);
    expect(getMoveError(r.state, 0, 1)).toBeNull();
  });
  it('a frozen top blocks pouring from it and onto it', () => {
    const l = mk([{ liquids: 'R^', thawWhen: { type: 'movesMade', count: 9 } }, 'R', '']);
    const s = createInitialState(l);
    expect(getMoveError(s, 0, 2)).toBe('sourceFrozenTop');
    expect(getMoveError(s, 1, 0)).toBe('destFrozenTop');
  });
  it('a run stops at a frozen layer', () => {
    const l = mk([{ liquids: 'R^RR', thawWhen: { type: 'movesMade', count: 9 } }, '']);
    const r = move(l, createInitialState(l), 0, 1);
    expect(r.events[0]).toMatchObject({ amount: 2 });
    expect(r.state.tubes[0].liquids).toHaveLength(1);
  });
  it('all frozen layers thaw at once when the condition is met', () => {
    const l = mk([{ liquids: 'R^R^B', thawWhen: { type: 'movesMade', count: 1 } }, '']);
    const r = move(l, createInitialState(l), 0, 1);
    expect(types(r.events)).toEqual(['poured', 'thawed']);
    expect(r.state.tubes[0].liquids.every((x) => !x.frozen)).toBe(true);
  });
  it('a tube is not complete until it has thawed, then seals', () => {
    const l = mk([{ liquids: 'R^RRR', thawWhen: { type: 'colorCompleted', color: 'blue' } }, 'BBB', 'B']);
    const s = createInitialState(l);
    expect(s.tubes[0].sealed).toBe(false);
    const r = move(l, s, 2, 1);
    expect(types(r.events)).toEqual(['poured', 'tubeCompleted', 'thawed', 'tubeCompleted', 'solved']);
  });
});

describe('mystery liquid', () => {
  const level = mk(['R?B?GB', 'B', '', 'G'], { number: 4 });
  const s0 = createInitialState(level);
  it('hidden layers below the top stay hidden; the top is visible', () => {
    expect(s0.tubes[0].liquids.map((l) => !!l.hidden)).toEqual([true, true, false, false]);
  });
  it('a board that starts with a hidden top shows the true colour', () => {
    const s = createInitialState(mk(['RB?', '']));
    expect(s.tubes[0].liquids[1]).toEqual({ color: 'blue' });
  });
  it('reveals the new top after a pour', () => {
    const r = move(level, s0, 0, 1);
    expect(types(r.events)).toEqual(['poured']); // G stays above hidden? top of tube 0 is B -> goes onto B
    const r2 = move(level, r.state, 0, 3);
    expect(types(r2.events)).toEqual(['poured', 'revealed']);
    expect(r2.events[1]).toEqual({ type: 'revealed', tube: 0, layerIndex: 1, color: 'blue' });
    expect(r2.state.tubes[0].liquids[1].hidden).toBeUndefined();
    expect(r2.state.tubes[0].liquids[0].hidden).toBe(true);
  });
  it('a run stops at a hidden layer even if it has the same true colour', () => {
    const l = mk(['B?BB', 'G', '']);
    const r = move(l, createInitialState(l), 0, 2);
    expect(r.events[0]).toMatchObject({ amount: 2 });
    expect(types(r.events)).toEqual(['poured', 'revealed']);
  });
  it('a full single-colour tube with a hidden layer is not complete', () => {
    const s = createInitialState(mk(['B?BBB', '']));
    expect(s.tubes[0].sealed).toBe(false);
  });
});

describe('catalyst tubes', () => {
  const base = (effect: Parameters<typeof mk>[0][number] extends never ? never : any, target: CompactTube) =>
    mk([
      { liquids: 'B', catalyst: { triggerColor: 'red', effect } },
      'R',
      target,
      'BB', '',
    ]);
  it('unlockTube: fires once when the trigger colour is first poured in', () => {
    const l = base({ type: 'unlockTube', tubeId: 'T3' }, { liquids: 'G', lock: { unlockWhen: { type: 'movesMade', count: 99 } } });
    const s = createInitialState(l);
    expect(s.tubes[2].locked).toBe(true);
    // pouring the wrong colour into the catalyst does nothing: blue onto its blue
    const blue = move(l, s, 3, 0);
    expect(types(blue.events)).toEqual(['poured']);
    expect(blue.state.tubes[0].catalystSpent).toBe(false);
    // red onto a blue catalyst is illegal (colour mismatch), so empty it first
    const empty = move(l, blue.state, 0, 4);
    const r = move(l, empty.state, 1, 0);
    expect(types(r.events)).toEqual(['poured', 'catalystActivated', 'unlocked']);
    expect(r.events[1]).toEqual({ type: 'catalystActivated', tube: 0, effect: { type: 'unlockTube', tubeId: 'T3' } });
    expect(r.state.tubes[0].catalystSpent).toBe(true);
    expect(r.state.tubes[2].locked).toBe(false);
  });
  it('is spent after one activation', () => {
    const l = mk([{ liquids: '', catalyst: { triggerColor: 'red', effect: { type: 'unlockTube', tubeId: 'T2' } } }, { liquids: '', lock: { unlockWhen: { type: 'movesMade', count: 99 } } }, 'R', 'R']);
    const s = createInitialState(l);
    const a = move(l, s, 2, 0);
    expect(types(a.events)).toContain('catalystActivated');
    const b = move(l, a.state, 3, 0);
    expect(types(b.events)).toEqual(['poured']);
  });
  it('thawTube thaws every frozen layer of the target', () => {
    const l = mk([{ liquids: '', catalyst: { triggerColor: 'red', effect: { type: 'thawTube', tubeId: 'T2' } } }, { liquids: 'B^B^', thawWhen: { type: 'movesMade', count: 99 } }, 'R']);
    const r = move(l, createInitialState(l), 2, 0);
    expect(types(r.events)).toEqual(['poured', 'catalystActivated', 'thawed']);
    expect(r.state.tubes[1].liquids.every((x) => !x.frozen)).toBe(true);
  });
  it('revealTube reveals all hidden layers of the target, one event each', () => {
    const l = mk([{ liquids: '', catalyst: { triggerColor: 'red', effect: { type: 'revealTube', tubeId: 'T2' } } }, 'B?G?RG', 'R']);
    const r = move(l, createInitialState(l), 2, 0);
    expect(types(r.events)).toEqual(['poured', 'catalystActivated', 'revealed', 'revealed']);
    expect(r.state.tubes[1].liquids.some((x) => x.hidden)).toBe(false);
  });
  it('an effect aimed at an unknown tube is ignored safely', () => {
    const l = mk([{ liquids: '', catalyst: { triggerColor: 'red', effect: { type: 'unlockTube', tubeId: 'NOPE' } } }, 'R']);
    const r = move(l, createInitialState(l), 1, 0);
    expect(types(r.events)).toEqual(['poured', 'catalystActivated']);
  });
});

describe('undo reverses every mechanic', () => {
  it('unlock, thaw, reveal, catalyst and sealing are all restored', () => {
    const l = mk([
      { liquids: '', catalyst: { triggerColor: 'red', effect: { type: 'revealTube', tubeId: 'T2' } } },
      'B?G?G', { liquids: 'B^B^', thawWhen: { type: 'movesMade', count: 1 } },
      { liquids: 'G', lock: { unlockWhen: { type: 'movesMade', count: 1 } } }, 'R', '',
    ]);
    let s = createSession(l);
    const before = s.current;
    const r = applyMove(s, { from: 4, to: 0 });
    s = r.session;
    expect(types(r.events)).toEqual(expect.arrayContaining(['catalystActivated', 'revealed', 'thawed', 'unlocked']));
    expect(s.current.tubes[0].catalystSpent).toBe(true);
    const u = undoMove(s)!;
    expect(u.current).toEqual(before);
    expect(u.current.tubes[0].catalystSpent).toBe(false);
    expect(u.current.tubes[1].liquids[0].hidden).toBe(true);
    expect(u.current.tubes[2].liquids[0].frozen).toBe(true);
    expect(u.current.tubes[3].locked).toBe(true);
    // and the same move plays out identically again
    expect(applyMove(u, { from: 4, to: 0 }).session.current).toEqual(s.current);
  });
  it('mechanics survive save and restore', () => {
    const l = mk([{ liquids: 'R^RB?G', thawWhen: { type: 'movesMade', count: 5 } }, { liquids: 'B', lock: { unlockWhen: { type: 'movesMade', count: 4 } } }, 'G', '']);
    let s = createSession(l);
    s = applyMove(s, { from: 0, to: 2 }).session;
    const back = deserializeSession(serializeSession(s), [l])!;
    expect(back.current).toEqual(s.current);
    expect(back.current.tubes[1].locked).toBe(true);
  });
});

describe('deadlock with mechanics', () => {
  it('a stuck board is a deadlock even if a locked tube would open later', () => {
    const l = mk(['RB', 'BR', { liquids: 'G', lock: { unlockWhen: { type: 'movesMade', count: 9 } } }]);
    expect(isDeadlocked(createInitialState(l))).toBe(true);
  });
  it('a relabel into an unspent catalyst tube is progress, not a deadlock', () => {
    const l = mk([
      'G',
      { liquids: '', catalyst: { triggerColor: 'green', effect: { type: 'unlockTube', tubeId: 'T3' } } },
      { liquids: 'GGG', lock: { unlockWhen: { type: 'tubesCompleted', count: 9 } } },
    ]);
    const s = createInitialState(l);
    expect(isDeadlocked(s)).toBe(true); // without the level the move looks like a relabel
    expect(isDeadlocked(s, l)).toBe(false);
  });
  it('a relabel into a catalyst tube with a different trigger colour is still pointless', () => {
    const l = mk([
      'G',
      { liquids: '', catalyst: { triggerColor: 'red', effect: { type: 'unlockTube', tubeId: 'T3' } } },
      { liquids: 'GGG', lock: { unlockWhen: { type: 'tubesCompleted', count: 9 } } },
    ]);
    expect(isDeadlocked(createInitialState(l), l)).toBe(true);
  });
  it('any move is progress while a movesMade condition is pending', () => {
    const l = mk(['G', '', { liquids: 'GGG', lock: { unlockWhen: { type: 'movesMade', count: 1 } } }]);
    const s = createInitialState(l);
    expect(isDeadlocked(s, l)).toBe(false);
    const after = move(l, s, 0, 1).state; // the pour unlocks T3
    expect(after.tubes[2].locked).toBe(false);
  });
});

describe('reactor', () => {
  const level = mk(['RB', 'BR', ''], { rules: { reactor: { moveLimit: 6, bonusCoins: 40 } } });
  it('fills per move and reads Stabilised past the limit without failing', () => {
    expect(reactorMeter(level, 0)).toMatchObject({ limit: 6, fill: 0, stabilised: false });
    expect(reactorMeter(level, 3)).toMatchObject({ fill: 0.5, stabilised: false });
    expect(reactorMeter(level, 6)).toMatchObject({ fill: 1, stabilised: false });
    expect(reactorMeter(level, 7)).toMatchObject({ fill: 1, stabilised: true });
  });
  it('the bonus is earned up to and including the limit', () => {
    expect(reactorBonus(level, 6)).toBe(40);
    expect(reactorBonus(level, 7)).toBe(0);
  });
  it('ordinary levels have no reactor', () => {
    expect(reactorMeter(mk(['R']), 3)).toBeNull();
    expect(reactorBonus(mk(['R']), 3)).toBe(0);
  });
  it('undo takes the meter back', () => {
    expect(reactorMeter(level, 7)!.stabilised).toBe(true);
    expect(reactorMeter(level, 6)!.stabilised).toBe(false);
  });
});

describe('mechanic descriptions', () => {
  it('is empty for classic levels and describes each mechanic', () => {
    expect(describeMechanics(mk(['RB', '']))).toEqual([]);
    const l = mk([
      { liquids: 'R^B', thawWhen: { type: 'movesMade', count: 5 } },
      'G?G',
      { liquids: 'B', lock: { unlockWhen: { type: 'tubesCompleted', count: 2 } } },
      { liquids: '', catalyst: { triggerColor: 'red', effect: { type: 'unlockTube', tubeId: 'T3' } } },
    ], { rules: { reactor: { moveLimit: 9, bonusCoins: 50 } } });
    const lines = describeMechanics(l);
    expect(lines).toEqual([
      'Frozen layers cannot move. They thaw after 5 moves.',
      'Mystery layers show their colour once uncovered.',
      'Locked tubes open when 2 tubes are complete.',
      'Pour crimson into the glowing tube to unlock a tube.',
      'Reactor: finish within 9 moves for a bonus.',
    ]);
  });
});
