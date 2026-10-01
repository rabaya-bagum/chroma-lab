import { advanceTutorial, tutorialAllowsTap, tutorialHighlight } from '../../src/game/tutorial';
import { resolveTap } from '../../src/game/interaction';
import { applyMove, createSession } from '../../src/game/session';
import { isPuzzleSolved } from '../../src/game/rules';
import { LEVELS } from '../../src/data/levels';
import type { TutorialStep } from '../../src/game/tutorial';

describe('tutorial on level 1', () => {
  it('only the highlighted tube can be tapped during steps 1-2', () => {
    expect([0, 1, 2, 3, 4].map((t) => tutorialAllowsTap(0, t))).toEqual([true, false, false, false, false]);
    expect([0, 1, 2, 3, 4].map((t) => tutorialAllowsTap(1, t))).toEqual([false, false, false, true, false]);
    expect(tutorialAllowsTap(2, 2)).toBe(true);
    expect(tutorialAllowsTap(3, 2)).toBe(true);
  });
  it('plays through all four steps by doing what each asks', () => {
    let session = createSession(LEVELS[0]);
    let step: TutorialStep = 0;
    let selected: number | null = null;
    const tap = (tube: number) => {
      if (!tutorialAllowsTap(step, tube)) return;
      const action = resolveTap(session.current, selected, tube);
      const before = session.current;
      if (action.type === 'select') selected = action.tube;
      if (action.type === 'pour') { session = applyMove(session, { from: action.from, to: action.to }).session; selected = null; }
      step = advanceTutorial(step, action, before);
    };
    tap(2); expect(step).toBe(0);          // wrong tube ignored
    tap(0); expect(step).toBe(1);          // select T1
    tap(1); expect(step).toBe(1);          // wrong tube ignored
    tap(3); expect(step).toBe(2);          // pour onto the empty tube
    expect(tutorialHighlight(2)).toEqual([1, 3]);
    tap(1); tap(3); expect(step).toBe(3);  // pour red onto red
    tap(2); tap(0); expect(step).toBe(4);
    tap(2); tap(1);
    expect(isPuzzleSolved(session.current)).toBe(true);
    expect(session.current.moves).toBe(LEVELS[0].optimalMoves);
  });
  it('a pour onto an empty tube does not complete step 3', () => {
    const s = createSession(LEVELS[0]).current;
    expect(advanceTutorial(2, { type: 'pour', from: 1, to: 4 }, s)).toBe(2);
    expect(advanceTutorial(2, { type: 'pour', from: 1, to: 3 }, s)).toBe(2); // T4 empty before any pour
  });
});
