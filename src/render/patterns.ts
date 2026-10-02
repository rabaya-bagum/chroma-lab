import { Skia } from '@shopify/react-native-skia';
import type { SkPath } from '@shopify/react-native-skia';
import type { LiquidColor } from '../game/types';

/** Accessibility pattern per colour (§7.4). */
export type PatternKind =
  | 'circles' | 'diagonal' | 'dots' | 'grid' | 'diamonds' | 'waves' | 'lines' | 'chevrons';

export const PATTERN_FOR: Record<LiquidColor, PatternKind> = {
  red: 'circles',
  blue: 'diagonal',
  yellow: 'dots',
  green: 'grid',
  purple: 'diamonds',
  orange: 'waves',
  cyan: 'lines',
  pink: 'chevrons',
};

/** Dots are filled shapes; everything else is drawn as strokes. */
export const isFilledPattern = (k: PatternKind): boolean => { 'worklet'; return k === 'dots'; };

const cache = new Map<string, SkPath>();

/** Pattern for one unit cell of size w x h, in the cell's local coordinates. */
export function patternPath(kind: PatternKind, w: number, h: number): SkPath {
  const key = `${kind}:${Math.round(w * 10)}x${Math.round(h * 10)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = Skia.PathBuilder.Make();
  switch (kind) {
    case 'circles': {
      const r = h * 0.17;
      p.addCircle(w * 0.3, h * 0.5, r);
      p.addCircle(w * 0.7, h * 0.5, r);
      break;
    }
    case 'diagonal': {
      for (let x = -h; x < w; x += w / 3.5) { p.moveTo(x, h); p.lineTo(x + h, 0); }
      break;
    }
    case 'dots': {
      const r = Math.max(1.2, h * 0.07);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) p.addCircle(w * (0.2 + i * 0.2), h * (0.3 + j * 0.4), r);
      break;
    }
    case 'grid': {
      for (let i = 1; i < 4; i++) { p.moveTo((w * i) / 4, 0); p.lineTo((w * i) / 4, h); }
      p.moveTo(0, h / 2); p.lineTo(w, h / 2);
      break;
    }
    case 'diamonds': {
      const r = h * 0.3;
      for (const cx of [w * 0.3, w * 0.7]) {
        p.moveTo(cx, h / 2 - r); p.lineTo(cx + r * 0.8, h / 2); p.lineTo(cx, h / 2 + r); p.lineTo(cx - r * 0.8, h / 2); p.close();
      }
      break;
    }
    case 'waves': {
      for (const y of [h * 0.32, h * 0.68]) {
        p.moveTo(0, y);
        const seg = w / 4;
        for (let i = 0; i < 4; i++) p.quadTo(seg * (i + 0.5), y + (i % 2 ? h * 0.16 : -h * 0.16), seg * (i + 1), y);
      }
      break;
    }
    case 'lines': {
      for (const y of [0.25, 0.5, 0.75]) { p.moveTo(0, h * y); p.lineTo(w, h * y); }
      break;
    }
    case 'chevrons': {
      for (const cx of [w * 0.28, w * 0.62]) {
        p.moveTo(cx - w * 0.12, h * 0.25); p.lineTo(cx + w * 0.06, h * 0.5); p.lineTo(cx - w * 0.12, h * 0.75);
      }
      break;
    }
  }
  const built = p.build();
  cache.set(key, built);
  return built;
}
