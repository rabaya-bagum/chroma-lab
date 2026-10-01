import { Skia } from '@shopify/react-native-skia';
import type { SkPath } from '@shopify/react-native-skia';

/** Horizontal glass inset (liquid sits this far from the tube edge). */
export const GLASS_INSET = 4;
/** Vertical padding above and below the liquid stack; matches utils/layout. */
export const TUBE_PAD = 6;

export interface TubePaths {
  /** Closed body (open-topped tube with a round bottom), used for clipping liquid. */
  body: SkPath;
  /** Same outline without the top edge, for stroking the glass. */
  outline: SkPath;
  /** Thin highlight strip on the left of the glass. */
  highlight: SkPath;
  /** Thin reflection on the right. */
  reflection: SkPath;
  /** Mouth ellipse. */
  rim: SkPath;
}

const cache = new Map<string, TubePaths>();

export function tubePaths(w: number, h: number): TubePaths {
  const key = `${Math.round(w * 10)}x${Math.round(h * 10)}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const r = w / 2 - 1;              // bottom is a half-circle
  const left = 1, right = w - 1;

  const body = Skia.PathBuilder.Make();
  body.moveTo(left, 0);
  body.lineTo(left, h - r);
  body.arcToTangent(left, h, left + r, h, r);
  body.arcToTangent(right, h, right, h - r, r);
  body.lineTo(right, 0);
  body.close();

  const outline = Skia.PathBuilder.Make();
  outline.moveTo(left, 0);
  outline.lineTo(left, h - r);
  outline.arcToTangent(left, h, left + r, h, r);
  outline.arcToTangent(right, h, right, h - r, r);
  outline.lineTo(right, 0);

  const highlight = Skia.PathBuilder.Make();
  highlight.addRRect(Skia.RRectXY(Skia.XYWHRect(left + 4, 6, 3, h - r - 14), 1.5, 1.5));

  const reflection = Skia.PathBuilder.Make();
  reflection.addRRect(Skia.RRectXY(Skia.XYWHRect(right - 6, 10, 2, h * 0.3), 1, 1));

  const rim = Skia.PathBuilder.Make();
  rim.addOval(Skia.XYWHRect(left, -2.5, right - left, 5));

  const paths = { body: body.build(), outline: outline.build(), highlight: highlight.build(), reflection: reflection.build(), rim: rim.build() };
  cache.set(key, paths);
  return paths;
}
