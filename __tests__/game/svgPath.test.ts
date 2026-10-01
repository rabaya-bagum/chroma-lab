import { parsePathD } from '../../src/render/pathCommands';

describe('parsePathD', () => {
  it('parses a cubic curve', () => {
    expect(parsePathD('M60 86 C80 80 80 40 58 28')).toEqual([
      { op: 'M', x: 60, y: 86 },
      { op: 'C', x1: 80, y1: 80, x2: 80, y2: 40, x: 58, y: 28 },
    ]);
  });
  it('handles negatives, H/V and repeated M', () => {
    expect(parsePathD('M-26 0 H26 M0 -26 V26')).toEqual([
      { op: 'M', x: -26, y: 0 }, { op: 'L', x: 26, y: 0 },
      { op: 'M', x: 0, y: -26 }, { op: 'L', x: 0, y: 26 },
    ]);
  });
  it('implicit lineto after M and closing', () => {
    expect(parsePathD('M32 82 L18 30 H82 L68 82 Z')).toEqual([
      { op: 'M', x: 32, y: 82 }, { op: 'L', x: 18, y: 30 }, { op: 'L', x: 82, y: 30 }, { op: 'L', x: 68, y: 82 }, { op: 'Z' },
    ]);
    expect(parsePathD('M0 0 10 10')).toEqual([{ op: 'M', x: 0, y: 0 }, { op: 'L', x: 10, y: 10 }]);
  });
  it('ignores empty input', () => expect(parsePathD('')).toEqual([]));
});
