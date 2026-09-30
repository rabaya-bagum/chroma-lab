import { createRng } from '../../src/utils/seededRandom';

describe('seededRandom', () => {
  const seq = (seed: string, n = 10) => { const r = createRng(seed); return Array.from({ length: n }, () => r.next()); };
  it('same seed gives the same sequence', () => expect(seq('abc')).toEqual(seq('abc')));
  it('different seeds differ', () => expect(seq('abc')).not.toEqual(seq('abd')));
  it('next is in [0,1) and int is in range', () => {
    const r = createRng('x');
    for (let i = 0; i < 1000; i++) { const v = r.next(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); expect(r.int(7)).toBeLessThan(7); }
  });
  it('shuffle is a deterministic permutation', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const a = createRng('s').shuffle(items), b = createRng('s').shuffle(items);
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual(items);
  });
});
