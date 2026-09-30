import { getMoveError, topRunLength } from './rules';
import type { GameState } from './types';

export type TapAction =
  | { type: 'select'; tube: number }
  | { type: 'deselect' }
  | { type: 'pour'; from: number; to: number }
  | { type: 'moveSelection'; tube: number }
  | { type: 'shake'; tube: number; warn: boolean };

/** A tube can be picked up if it has something pourable on top (§7.1). */
export function isSelectable(state: GameState, tube: number): boolean {
  const t = state.tubes[tube];
  return !!t && t.liquids.length > 0 && !t.locked && !t.sealed && topRunLength(t) > 0;
}

/** Decide what a tap on `tube` does given the current selection (§7.1 table). */
export function resolveTap(state: GameState, selected: number | null, tube: number): TapAction {
  if (selected === null) {
    return isSelectable(state, tube) ? { type: 'select', tube } : { type: 'shake', tube, warn: false };
  }
  if (selected === tube) return { type: 'deselect' };
  if (getMoveError(state, selected, tube) === null) return { type: 'pour', from: selected, to: tube };
  if (isSelectable(state, tube)) return { type: 'moveSelection', tube };
  return { type: 'shake', tube, warn: true };
}
