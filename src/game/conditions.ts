import { COLOR_NAMES } from '../config/theme';
import type { Condition, GameState } from './types';

const completeTubes = (state: GameState) => state.tubes.filter((t) => t.sealed);

/** Whether an unlock/thaw condition holds in `state` (§11). */
export function isConditionMet(c: Condition, state: GameState): boolean {
  switch (c.type) {
    case 'movesMade': return state.moves >= c.count;
    case 'tubesCompleted': return completeTubes(state).length >= c.count;
    case 'colorCompleted': return completeTubes(state).some((t) => t.liquids[0]?.color === c.color);
  }
}

export interface ConditionProgress { current: number; target: number }

/** How far along a condition is, for the lock counter ("3/5 moves"). */
export function conditionProgress(c: Condition, state: GameState): ConditionProgress {
  switch (c.type) {
    case 'movesMade': return { current: Math.min(state.moves, c.count), target: c.count };
    case 'tubesCompleted': return { current: Math.min(completeTubes(state).length, c.count), target: c.count };
    case 'colorCompleted': return { current: isConditionMet(c, state) ? 1 : 0, target: 1 };
  }
}

/** Short text for the lock badge and screen readers, for example "3/5 moves". */
export function describeProgress(c: Condition, state: GameState): string {
  const p = conditionProgress(c, state);
  switch (c.type) {
    case 'movesMade': return `${p.current}/${p.target} moves`;
    case 'tubesCompleted': return `${p.current}/${p.target} tubes`;
    case 'colorCompleted': return `${COLOR_NAMES[c.color].toLowerCase()} ${p.current}/1`;
  }
}

/** The condition as a sentence fragment, for level hints ("after 5 moves"). */
export function describeCondition(c: Condition): string {
  switch (c.type) {
    case 'movesMade': return `after ${c.count} moves`;
    case 'tubesCompleted': return c.count === 1 ? 'when a tube is complete' : `when ${c.count} tubes are complete`;
    case 'colorCompleted': return `when ${COLOR_NAMES[c.color].toLowerCase()} is complete`;
  }
}
