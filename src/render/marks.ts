import { Skia } from '@shopify/react-native-skia';
import type { SkPath } from '@shopify/react-native-skia';

const cache = new Map<string, SkPath>();

/** A "?" centred on the origin, `size` tall, for mystery layers. */
export function questionPath(size: number): SkPath {
  const key = `q${Math.round(size * 10)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const s = size / 20;
  const p = Skia.Path.Make();
  p.moveTo(-5 * s, -5 * s);
  p.cubicTo(-5 * s, -12 * s, 6 * s, -12 * s, 6 * s, -5 * s);
  p.cubicTo(6 * s, 0, 0, 0, 0, 5 * s);
  p.addCircle(0, 10 * s, 1.4 * s);
  cache.set(key, p);
  return p;
}

/** A padlock shackle (open arc) centred on the origin, `size` wide. */
export function shacklePath(size: number): SkPath {
  const key = `s${Math.round(size * 10)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const s = size / 20;
  const p = Skia.Path.Make();
  p.moveTo(-5 * s, -2 * s);
  p.lineTo(-5 * s, -7 * s);
  p.cubicTo(-5 * s, -16 * s, 5 * s, -16 * s, 5 * s, -7 * s);
  p.lineTo(5 * s, -2 * s);
  cache.set(key, p);
  return p;
}

/** Jagged frost cracks for a layer cell of w x h. */
export function crackPath(w: number, h: number): SkPath {
  const key = `c${Math.round(w * 10)}x${Math.round(h * 10)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = Skia.Path.Make();
  p.moveTo(w * 0.15, h * 0.2); p.lineTo(w * 0.38, h * 0.45); p.lineTo(w * 0.3, h * 0.7); p.lineTo(w * 0.52, h * 0.9);
  p.moveTo(w * 0.38, h * 0.45); p.lineTo(w * 0.7, h * 0.35); p.lineTo(w * 0.88, h * 0.55);
  p.moveTo(w * 0.7, h * 0.35); p.lineTo(w * 0.78, h * 0.1);
  cache.set(key, p);
  return p;
}
