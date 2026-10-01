import {
  burstCount, createQualityState, DOWN_AFTER_MS, idlePhasePeriod, MAX_DOWNGRADES, qualityStep,
  QUALITY_FULL, QUALITY_LITE, UP_AFTER_MS, WARMUP_MS,
} from '../../src/render/quality';
import { addCirclesOfKind, createParticleState, emit, KIND_BUBBLE, KIND_SPARK, liveOfKind } from '../../src/render/particles';

/** Feed `ms` of frames at `frameMs` each; returns the tier at the end. */
function run(s: number[], ms: number, frameMs: number): number {
  let tier = s[1];
  for (let t = 0; t < ms; t += frameMs) tier = qualityStep(s, frameMs);
  return tier;
}

describe('adaptive quality', () => {
  it('stays full at 60 fps', () => {
    const s = createQualityState();
    expect(run(s, 60_000, 16.7)).toBe(QUALITY_FULL);
  });

  it('ignores a slow start (warm-up)', () => {
    const s = createQualityState();
    expect(run(s, WARMUP_MS - 100, 40)).toBe(QUALITY_FULL);
  });

  it('steps down after sustained slowness, not after a short hitch', () => {
    const s = createQualityState();
    run(s, WARMUP_MS + 500, 16.7);
    expect(run(s, 600, 50)).toBe(QUALITY_FULL);                 // a hitch
    run(s, 3000, 16.7);                                          // recovers
    expect(run(s, DOWN_AFTER_MS + 1500, 40)).toBe(QUALITY_LITE); // 25 fps for long enough
  });

  it('ignores stalls such as backgrounding', () => {
    const s = createQualityState();
    run(s, WARMUP_MS + 500, 16.7);
    for (let i = 0; i < 50; i++) qualityStep(s, 5000);
    expect(s[1]).toBe(QUALITY_FULL);
  });

  it('recovers after a long healthy stretch, until it has stepped down MAX_DOWNGRADES times', () => {
    const s = createQualityState();
    run(s, WARMUP_MS + 500, 16.7);
    for (let n = 1; n < MAX_DOWNGRADES; n++) {
      expect(run(s, DOWN_AFTER_MS + 3000, 40)).toBe(QUALITY_LITE);
      expect(run(s, UP_AFTER_MS + 3000, 16.7)).toBe(QUALITY_FULL);
    }
    expect(run(s, DOWN_AFTER_MS + 3000, 40)).toBe(QUALITY_LITE);
    expect(s[4]).toBe(MAX_DOWNGRADES);
    expect(run(s, UP_AFTER_MS * 3, 16.7)).toBe(QUALITY_LITE);   // stays light: no flapping
  });

  it('tier settings', () => {
    expect(idlePhasePeriod(QUALITY_FULL)).toBe(0);
    expect(idlePhasePeriod(QUALITY_LITE)).toBeCloseTo(0.05);
    expect(burstCount(9, QUALITY_FULL)).toBe(9);
    expect(burstCount(9, QUALITY_LITE)).toBe(5);
    expect(burstCount(1, QUALITY_LITE)).toBe(1);
  });
});

describe('allocation-free particle pass', () => {
  it('adds exactly the circles liveOfKind reports', () => {
    const a = createParticleState();
    for (let i = 0; i < 60; i++) {
      emit(a, { x: i, y: i * 2, vx: 0, vy: 0, life: 0.2 + i / 100, size: 1 + (i % 3), kind: i % 3 === 0 ? KIND_SPARK : KIND_BUBBLE });
    }
    for (const kind of [KIND_BUBBLE, KIND_SPARK]) {
      const got: number[][] = [];
      const n = addCirclesOfKind(a, kind, { addCircle: (x, y, r) => { got.push([x, y, r]); } });
      const want = liveOfKind(a, kind).map((p) => [p.x, p.y, p.r]);
      expect(n).toBe(want.length);
      expect(got).toEqual(want);
    }
  });
});
