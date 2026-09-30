import { addExtraTube, applyMove, restartLevel, undoMove, createSession } from '../../src/game/session';
import { sessionOf, makeLevel } from '../helpers';
import { calculateStars } from '../../src/game/scoring';
import { serializeSession, deserializeSession } from '../../src/game/serialize';

describe('applyMove / undoMove', () => {
  it('pushes history and counts moves', () => {
    const { session, events } = applyMove(sessionOf(['BR', '']), { from: 0, to: 1 });
    expect(events.length).toBeGreaterThan(0);
    expect(session.history).toHaveLength(1);
    expect(session.current.moves).toBe(1);
  });
  it('ignores invalid moves', () => {
    const s = sessionOf(['R', 'B']);
    const r = applyMove(s, { from: 0, to: 1 });
    expect(r.session).toBe(s);
    expect(r.session.history).toHaveLength(0);
  });
  it('undo returns null on empty history', () => expect(undoMove(sessionOf(['BR', ''])) ).toBeNull());
  it('undo restores the snapshot and the move count, and counts the undo', () => {
    const s0 = sessionOf(['BR', '']);
    const s1 = applyMove(s0, { from: 0, to: 1 }).session;
    const s2 = undoMove(s1)!;
    expect(s2.current).toBe(s0.current);
    expect(s2.current.moves).toBe(0);
    expect(s2.undosUsed).toBe(1);
    expect(s2.history).toHaveLength(0);
  });
  it('undo reverses a tube sealing', () => {
    const s0 = sessionOf(['BR', 'RRR', '']);
    const s1 = applyMove(s0, { from: 0, to: 1 }).session;
    expect(s1.current.tubes[1].sealed).toBe(true);
    expect(undoMove(s1)!.current.tubes[1].sealed).toBe(false);
  });
});

describe('restartLevel', () => {
  it('resets tubes, moves, history and timer but keeps counters', () => {
    let s = sessionOf(['BR', '', '']);
    s = applyMove(s, { from: 0, to: 1 }).session;
    s = undoMove(s)!;
    s = applyMove(s, { from: 0, to: 1 }).session;
    s = { ...s, elapsedMs: 5000, hintsUsed: 2 };
    const r = restartLevel(s);
    expect(r.current).toBe(r.initial);
    expect(r.history).toHaveLength(0);
    expect(r.current.moves).toBe(0);
    expect(r.elapsedMs).toBe(0);
    expect(r.undosUsed).toBe(1);
    expect(r.hintsUsed).toBe(2);
  });
  it('keeps the purchased extra tube', () => {
    let s = addExtraTube(sessionOf(['BR', '']));
    s = applyMove(s, { from: 0, to: 2 }).session;
    const r = restartLevel(s);
    expect(r.current.tubes).toHaveLength(3);
    expect(r.extraTubeUsed).toBe(true);
    expect(r.current.tubes[2].isExtra).toBe(true);
  });
});

describe('addExtraTube', () => {
  it('appends one empty tube of capacity 4, once', () => {
    const s = addExtraTube(sessionOf(['BR', '']));
    expect(s.current.tubes).toHaveLength(3);
    expect(s.current.tubes[2]).toMatchObject({ capacity: 4, liquids: [], isExtra: true });
    expect(addExtraTube(s)).toBe(s);
  });
  it('survives undo', () => {
    let s = sessionOf(['BR', '']);
    s = applyMove(s, { from: 0, to: 1 }).session;
    s = addExtraTube(s);
    const u = undoMove(s)!;
    expect(u.current.tubes).toHaveLength(3);
  });
});

describe('calculateStars', () => {
  const level = makeLevel(['R'], 10);
  const none = { extraTubeUsed: false };
  it.each([
    [10, 3], [12, 3], [13, 2], [18, 2], [19, 1], [40, 1],
  ])('moves=%i -> %i stars', (moves, stars) => expect(calculateStars(moves, level, none)).toBe(stars));
  it('caps at 2 stars with an extra tube', () => {
    expect(calculateStars(10, level, { extraTubeUsed: true })).toBe(2);
    expect(calculateStars(19, level, { extraTubeUsed: true })).toBe(1);
  });
});

describe('serializeSession / deserializeSession', () => {
  const levels = [makeLevel(['BR', 'RB', ''], 3, 'T')];
  const played = () => {
    let s = createSession(levels[0], 1234);
    s = applyMove(s, { from: 0, to: 2 }).session;
    s = applyMove(s, { from: 1, to: 2 }).session;
    return addExtraTube({ ...s, elapsedMs: 900 });
  };
  it('round-trips', () => {
    const s = played();
    const back = deserializeSession(serializeSession(s), levels)!;
    expect(back).not.toBeNull();
    expect(back.current).toEqual(s.current);
    expect(back.history).toEqual(s.history);
    expect(back.initial).toEqual(s.initial);
    expect(back.extraTubeUsed).toBe(true);
    expect(back.elapsedMs).toBe(900);
    expect(back.startedAt).toBe(1234);
  });
  it('rejects garbage, wrong version and unknown levels', () => {
    expect(deserializeSession('not json', levels)).toBeNull();
    expect(deserializeSession('{}', levels)).toBeNull();
    expect(deserializeSession('null', levels)).toBeNull();
    const json = serializeSession(played());
    expect(deserializeSession(json.replace('"v":1', '"v":2'), levels)).toBeNull();
    expect(deserializeSession(json, [])).toBeNull();
  });
  it('rejects tampered data', () => {
    const obj = JSON.parse(serializeSession(played()));
    const bad = (mutate: (o: any) => void) => {
      const c = JSON.parse(JSON.stringify(obj));
      mutate(c);
      return deserializeSession(JSON.stringify(c), levels);
    };
    expect(bad((o) => (o.current.tubes[0].liquids[0].color = 'magenta'))).toBeNull();
    expect(bad((o) => o.current.tubes[2].liquids.push({ color: 'red' }))).toBeNull(); // colour count changes
    expect(bad((o) => (o.current.moves = 99))).toBeNull();
    expect(bad((o) => (o.undosUsed = -1))).toBeNull();
    expect(bad((o) => delete o.history)).toBeNull();
    expect(bad((o) => (o.initial.tubes[0].id = 'Z'))).toBeNull();
  });
});
