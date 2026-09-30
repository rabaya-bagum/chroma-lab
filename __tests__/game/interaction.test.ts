import { isSelectable, resolveTap } from '../../src/game/interaction';
import { stateOf } from '../helpers';

describe('resolveTap (§7.1)', () => {
  const s = stateOf(['BR', 'R', 'GG', 'RRRR', '']);
  it('selects a selectable tube', () => expect(resolveTap(s, null, 0)).toEqual({ type: 'select', tube: 0 }));
  it('shakes a non-selectable tube with no selection', () => {
    expect(resolveTap(s, null, 4)).toEqual({ type: 'shake', tube: 4, warn: false }); // empty
    expect(resolveTap(s, null, 3)).toEqual({ type: 'shake', tube: 3, warn: false }); // sealed
  });
  it('deselects on the same tube', () => expect(resolveTap(s, 0, 0)).toEqual({ type: 'deselect' }));
  it('pours on a valid destination', () => expect(resolveTap(s, 0, 1)).toEqual({ type: 'pour', from: 0, to: 1 }));
  it('moves the selection to another selectable tube when the pour is invalid', () => {
    expect(resolveTap(s, 0, 2)).toEqual({ type: 'moveSelection', tube: 2 });
  });
  it('shakes with a warning when the target is invalid and not selectable', () => {
    expect(resolveTap(s, 0, 3)).toEqual({ type: 'shake', tube: 3, warn: true });
  });
  it('isSelectable', () => {
    expect(isSelectable(s, 4)).toBe(false);
    expect(isSelectable(s, 0)).toBe(true);
    expect(isSelectable(s, 9)).toBe(false);
  });
});
