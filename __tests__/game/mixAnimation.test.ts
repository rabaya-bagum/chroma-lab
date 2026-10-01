import { slotLookAt } from '../../src/render/plan';
import type { Plan } from '../../src/render/plan';

// A red drop pours onto a blue unit (tube 1, slot 0); both end up purple.
const plan = {
  kind: 'pour', from: 0, to: 1, amount: 1, srcKeep: 2, dstStart: 1,
  color: 'red', hex: '#ff0000', arriveHex: '#8000ff', arriveName: 'purple',
  fade: { tube: 1, slot: 0, from: '#0000ff', to: '#8000ff', fromName: 'blue', toName: 'purple' },
} as unknown as Plan;

describe('mixing animation look', () => {
  it('without a plan the committed colour is used', () => {
    expect(slotLookAt(null, 1, 0, 0.5, 'blue', '#0000ff')).toEqual({ name: 'blue', hex: '#0000ff' });
  });
  it('the arriving drop and the resting unit blend toward the result', () => {
    expect(slotLookAt(plan, 1, 1, 0, '', '')).toEqual({ name: 'red', hex: '#ff0000' });
    expect(slotLookAt(plan, 1, 0, 0, 'blue', '#0000ff')).toEqual({ name: 'blue', hex: '#0000ff' });
    const mid = slotLookAt(plan, 1, 1, 0.5, '', '');
    expect(mid.hex).toBe('#c00080');
    const end = slotLookAt(plan, 1, 1, 1, '', '');
    expect(end).toEqual({ name: 'purple', hex: '#8000ff' });
    expect(slotLookAt(plan, 1, 0, 1, 'blue', '#0000ff')).toEqual({ name: 'purple', hex: '#8000ff' });
  });
  it('the source keeps the poured colour and other tubes are untouched', () => {
    expect(slotLookAt(plan, 0, 2, 0.7, 'red', '#ff0000')).toEqual({ name: 'red', hex: '#ff0000' });
    expect(slotLookAt(plan, 2, 0, 0.7, 'cyan', '#00ffff')).toEqual({ name: 'cyan', hex: '#00ffff' });
  });
  it('an undo plan keeps the leaving unit purple while the rest turns blue again', () => {
    const undo = {
      kind: 'slide', from: 1, to: 0, amount: 1, srcKeep: 1, dstStart: 2, color: 'purple', hex: '#ff0000',
      srcHex: '#8000ff', srcName: 'purple',
      fade: { tube: 1, slot: 0, from: '#8000ff', to: '#0000ff', fromName: 'purple', toName: 'blue' },
    } as unknown as Plan;
    expect(slotLookAt(undo, 1, 1, 0.5, 'purple', '#8000ff')).toEqual({ name: 'purple', hex: '#8000ff' });
    expect(slotLookAt(undo, 1, 0, 1, 'purple', '#8000ff')).toEqual({ name: 'blue', hex: '#0000ff' });
    expect(slotLookAt(undo, 0, 2, 1, '', '')).toEqual({ name: 'purple', hex: '#ff0000' });
  });
});
