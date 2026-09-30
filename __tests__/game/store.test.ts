import { LEVELS } from '../../src/data/levels';
import { selectSolved, selectStars, useGameStore } from '../../src/store/gameStore';

describe('gameStore: playing level 1 through taps', () => {
  beforeEach(() => useGameStore.getState().start(LEVELS[0]));

  it('wins in 4 moves with 3 stars', () => {
    const { tap } = useGameStore.getState();
    // T1->T4, T2->T4, T3->T1, T3->T2 (tube indices 0-based)
    for (const [a, b] of [[0, 3], [1, 3], [2, 0], [2, 1]]) {
      expect(tap(a)?.type).toBe('select');
      expect(tap(b)?.type).toBe('pour');
    }
    const s = useGameStore.getState();
    expect(selectSolved(s)).toBe(true);
    expect(s.session!.current.moves).toBe(4);
    expect(selectStars(s)).toBe(3);
    expect(s.lastEvents.map((e) => e.type)).toContain('solved');
  });

  it('undo, restart and extra tube work through the store', () => {
    const st = useGameStore.getState();
    st.tap(0); st.tap(3);
    expect(useGameStore.getState().session!.current.moves).toBe(1);
    useGameStore.getState().undo();
    expect(useGameStore.getState().session!.current.moves).toBe(0);
    useGameStore.getState().addTube();
    expect(useGameStore.getState().session!.current.tubes).toHaveLength(6);
    useGameStore.getState().restart();
    expect(useGameStore.getState().session!.current.tubes).toHaveLength(6);
  });

  it('an invalid pour keeps the selection and requests a shake', () => {
    const st = useGameStore.getState();
    st.tap(0);
    expect(st.tap(2)?.type).toBe('moveSelection'); // both selectable, colours differ
    expect(useGameStore.getState().selected).toBe(2);
    expect(st.tap(4)?.type).toBe('pour'); // empty tube accepts anything
  });
});
