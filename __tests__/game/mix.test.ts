import { bitsOf, hasBit, mixHex } from '../../src/render/mix';

describe('mixHex', () => {
  it('blends and clamps', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mixHex('#000000', '#ff8000', 0.5)).toBe('#804000');
    expect(mixHex('#102030', '#102030', 0.7)).toBe('#102030');
    expect(mixHex('#000000', '#ffffff', 2)).toBe('#ffffff');
    expect(mixHex('#000000', '#ffffff', -1)).toBe('#000000');
  });
  it('keeps leading zeros', () => {
    expect(mixHex('#000000', '#00000f', 1)).toBe('#00000f');
  });
});

describe('bit helpers', () => {
  it('bitsOf and hasBit round-trip', () => {
    const m = bitsOf([{ h: true }, { h: false }, { h: true }, {}], (x: { h?: boolean }) => x.h);
    expect(m).toBe(0b0101);
    expect([0, 1, 2, 3].map((k) => hasBit(m, k))).toEqual([true, false, true, false]);
    expect(bitsOf([], () => true)).toBe(0);
  });
});
