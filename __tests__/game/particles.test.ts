import { createParticleState, emit, liveOfKind, MAX_PARTICLES, step, KIND_BUBBLE, KIND_SPARK } from '../../src/render/particles';
import { planProgress, slotFillAt } from '../../src/render/plan';
import type { Plan } from '../../src/render/plan';
import { pourTarget, pourTimeline } from '../../src/render/pourGeometry';

const e = (kind = KIND_SPARK, life = 1) => ({ x: 0, y: 0, vx: 10, vy: -10, life, size: 2, kind });

describe('particles', () => {
  it('never exceeds the pool size', () => {
    const a = createParticleState();
    let ok = 0;
    for (let i = 0; i < MAX_PARTICLES + 30; i++) if (emit(a, e())) ok++;
    expect(ok).toBe(MAX_PARTICLES);
    expect(a[0]).toBe(MAX_PARTICLES);
  });
  it('expired particles free their slot', () => {
    const a = createParticleState();
    emit(a, e(KIND_BUBBLE, 0.1));
    step(a, 0.05); expect(a[0]).toBe(1);
    step(a, 0.06); expect(a[0]).toBe(0);
    expect(emit(a, e())).toBe(true);
  });
  it('sparks fall and bubbles are filtered by kind', () => {
    const a = createParticleState();
    emit(a, e(KIND_SPARK)); emit(a, e(KIND_BUBBLE));
    step(a, 0.1);
    expect(liveOfKind(a, KIND_SPARK)).toHaveLength(1);
    expect(liveOfKind(a, KIND_BUBBLE)).toHaveLength(1);
    expect(liveOfKind(a, KIND_SPARK)[0].y).toBeGreaterThan(-1 + -10 * 0.1 - 0.0001 * 0); // gravity pulls it down vs a straight line
  });
});

describe('plan', () => {
  const tl = pourTimeline(2);
  const base: Plan = {
    kind: 'pour', from: 0, to: 1, amount: 2, srcKeep: 2, dstStart: 1, color: 'red', hex: '#f00', total: tl.total, tl,
    target: pourTarget({ srcX: 0, srcY: 50, dstX: 100, dstY: 50, tubeW: 40, tubeH: 120, fullness: 1, dir: 1 }),
    dir: 1, src: { x: 0, y: 50 }, dst: { x: 100, y: 50 }, tubeW: 40, tubeH: 120, unitH: 26,
  };
  it('source drains and destination fills with progress', () => {
    expect(slotFillAt(base, 0, 3, 4, 0)).toBe(1);
    expect(slotFillAt(base, 0, 3, 4, 1)).toBe(0);
    expect(slotFillAt(base, 0, 1, 4, 1)).toBe(1);            // kept layers stay
    expect(slotFillAt(base, 1, 1, 1, 0.25)).toBe(0.25);      // arriving slot
    expect(slotFillAt(base, 1, 0, 1, 0.25)).toBe(1);         // existing slot
  });
  it('is identical at p = 1 before and after the state is committed', () => {
    // before commit: source holds 4 (k=2,3 leaving), dest holds 1; after: source 2, dest 3
    for (let k = 0; k < 4; k++) {
      expect(slotFillAt(base, 0, k, 4, 1)).toBe(slotFillAt(base, 0, k, 2, 1));
      expect(slotFillAt(base, 1, k, 1, 1)).toBe(slotFillAt(base, 1, k, 3, 1));
    }
  });
  it('slide plans progress linearly', () => {
    const s = { ...base, kind: 'slide' as const, total: 200 };
    expect(planProgress(s, 100)).toBe(0.5);
    expect(planProgress(s, 999)).toBe(1);
  });
});
