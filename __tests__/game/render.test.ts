import { describeEvents, describeTube } from '../../src/game/accessibility';
import { LIQUID_HEX, LIQUID_HEX_COLORBLIND, contrastRatio } from '../../src/config/theme';
import { computeLayout, maxColumns, rowSizes, MIN_TAP } from '../../src/utils/layout';
import { chooseSide, pourTarget, pourTimeline, poseAt, tiltFor, MAX_POUR_MS } from '../../src/render/pourGeometry';
import { stateOf } from '../helpers';

describe('layout', () => {
  it('column counts by width', () => {
    expect(maxColumns(360)).toBe(4);
    expect(maxColumns(412)).toBe(5);
    expect(maxColumns(768)).toBe(6);
    expect(maxColumns(1024)).toBe(7);
  });
  it('rowSizes balances rows', () => {
    expect(rowSizes(5, 5)).toEqual([5]);
    expect(rowSizes(9, 5)).toEqual([5, 4]);
    expect(rowSizes(8, 5)).toEqual([4, 4]);
    expect(rowSizes(7, 4)).toEqual([4, 3]);
    expect(rowSizes(0, 4)).toEqual([]);
  });
  it.each([[360, 520, 5], [360, 520, 9], [412, 700, 7], [820, 1000, 9], [1024, 1200, 14]])(
    'fits %ix%i with %i tubes, no overlap, taps >= 48',
    (w, h, n) => {
      const l = computeLayout(w, h, n);
      expect(l.positions).toHaveLength(n);
      l.positions.forEach((p) => {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x + l.tubeW).toBeLessThanOrEqual(w + 0.001);
        expect(p.y - l.lift).toBeGreaterThanOrEqual(-0.001);
        expect(p.y + l.tubeH).toBeLessThanOrEqual(h + 0.001);
      });
      l.cells.forEach((c) => { expect(c.w).toBeGreaterThanOrEqual(MIN_TAP); expect(c.h).toBeGreaterThanOrEqual(MIN_TAP); });
    },
  );
  it('centres a partial last row', () => {
    const l = computeLayout(360, 520, 7); // 4 + 3
    const row2 = l.positions.slice(4);
    const left = row2[0].x, right = row2[2].x + l.tubeW;
    expect(Math.abs(left - (360 - right))).toBeLessThan(0.001);
  });
});

describe('pour geometry', () => {
  it('total duration stays within 650 ms for every amount', () => {
    for (let a = 1; a <= 6; a++) expect(pourTimeline(a).total).toBeLessThanOrEqual(MAX_POUR_MS);
  });
  it('tilt scales with fullness: emptier tips further', () => {
    expect(tiltFor(0.25)).toBeGreaterThan(tiltFor(1));
  });
  const args = { srcX: 10, srcY: 100, dstX: 120, dstY: 100, tubeW: 50, tubeH: 160, fullness: 1, dir: 1 as const };
  it('places the lower lip above the destination mouth', () => {
    const t = pourTarget(args);
    const cx = args.srcX + args.tubeW / 2 + t.dx; // pivot x
    const lipX = cx + (args.tubeW / 2) * Math.cos(t.angle);
    expect(lipX).toBeCloseTo(args.dstX + args.tubeW / 2, 5);
    expect(t.angle).toBeGreaterThan(0);
    expect(pourTarget({ ...args, dir: -1 }).angle).toBeLessThan(0);
  });
  it('pose starts and ends at rest with p running 0..1', () => {
    const tl = pourTimeline(2), t = pourTarget(args);
    const start = poseAt(0, tl, t);
    expect(start.dx).toBeCloseTo(0); expect(start.dy).toBeCloseTo(0); expect(start.angle).toBeCloseTo(0); expect(start.p).toBe(0);
    const end = poseAt(tl.total, tl, t);
    expect(end.dx).toBeCloseTo(0); expect(end.angle).toBeCloseTo(0); expect(end.p).toBe(1);
    expect(poseAt(tl.travel, tl, t).p).toBe(0);
    expect(poseAt(tl.travel + tl.pour / 2, tl, t).p).toBeCloseTo(0.5);
    expect(poseAt(tl.travel + 1, tl, t).stream).toBe(1);
    expect(poseAt(tl.total - 1, tl, t).stream).toBe(0);
  });
});

describe('chooseSide', () => {
  const a = { srcY: 100, dstY: 100, tubeW: 50, tubeH: 160, fullness: 1, boardW: 390 };
  it('keeps the natural side when the body fits', () => {
    expect(chooseSide({ ...a, srcX: 150, dstX: 260 })).toBe(1);
    expect(chooseSide({ ...a, srcX: 260, dstX: 150 })).toBe(-1);
  });
  it('switches sides when the natural side would leave the board', () => {
    expect(chooseSide({ ...a, srcX: 10, dstX: 70 })).toBe(-1);   // would swing off the left edge
    expect(chooseSide({ ...a, srcX: 330, dstX: 270 })).toBe(1);  // would swing off the right edge
  });
});

describe('accessibility labels', () => {
  it('describes a tube as in the spec', () => {
    const s = stateOf(['RRBB', 'G', '', 'RRRR']);
    expect(describeTube(s.tubes[0], 2, 8)).toBe('Tube 3 of 8: bottom crimson, crimson, electric blue, top electric blue. 0 free spaces.');
    expect(describeTube(s.tubes[1], 1, 4, true)).toBe('Tube 2 of 4: bottom and top emerald. 3 free spaces. selected.');
    expect(describeTube(s.tubes[2], 0, 4)).toBe('Tube 1 of 4: empty. 4 free spaces.');
    expect(describeTube(s.tubes[3], 3, 4)).toContain('complete');
  });
  it('announces events', () => {
    expect(describeEvents([
      { type: 'poured', from: 0, to: 2, color: 'red', amount: 2 },
      { type: 'tubeCompleted', tube: 2, color: 'red' },
      { type: 'solved' },
    ])).toBe('Poured 2 crimson from tube 1 to tube 3. Tube 3 complete. Experiment complete.');
  });
});

describe('palette', () => {
  it('keeps the confusable pairs apart in luminance', () => {
    expect(contrastRatio(LIQUID_HEX.blue, LIQUID_HEX.cyan)).toBeGreaterThan(1.5);
    expect(contrastRatio(LIQUID_HEX.purple, LIQUID_HEX.pink)).toBeGreaterThan(1.5);
  });
  it('colour-blind palette has 8 distinct colours', () => {
    expect(new Set(Object.values(LIQUID_HEX_COLORBLIND)).size).toBe(8);
  });
});
