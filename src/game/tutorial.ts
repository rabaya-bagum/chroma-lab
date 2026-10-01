import type { TapAction } from './interaction';
import type { GameState } from './types';

/**
 * The level-1 tutorial (§8.5). Each step advances only when the player does the
 * action it asks for. Tube indices refer to level 1's layout (T1..T5 = 0..4).
 */
export type TutorialStep = 0 | 1 | 2 | 3 | 4; // 4 = finished

export const TUTORIAL_TEXT: Record<0 | 1 | 2 | 3, string> = {
  0: 'Tap a tube.',
  1: 'Tap another tube to pour.',
  2: 'Colours only stack on the same colour.',
  3: 'Fill each tube with one colour.',
};

/** Tubes to highlight for a step. */
export function tutorialHighlight(step: TutorialStep): number[] {
  switch (step) {
    case 0: return [0];
    case 1: return [3];
    case 2: return [1, 3];
    default: return [];
  }
}

/** During steps 0 and 1 only the highlighted tube may be tapped. */
export function tutorialAllowsTap(step: TutorialStep, tube: number): boolean {
  if (step === 0) return tube === 0;
  if (step === 1) return tube === 3;
  return true;
}

/**
 * Next step after a tap action. `before` is the board before the tap (to know
 * whether a pour landed on an occupied tube).
 */
export function advanceTutorial(step: TutorialStep, action: TapAction, before: GameState): TutorialStep {
  switch (step) {
    case 0: return action.type === 'select' ? 1 : 0;
    case 1: return action.type === 'pour' ? 2 : 1;
    case 2:
      return action.type === 'pour' && before.tubes[action.to].liquids.length > 0 ? 3 : 2;
    case 3: return action.type === 'pour' ? 4 : 3;
    default: return 4;
  }
}
