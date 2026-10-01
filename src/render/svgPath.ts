import { Skia } from '@shopify/react-native-skia';
import type { SkPath } from '@shopify/react-native-skia';
import { parsePathD } from './pathCommands';

/**
 * Build a Skia path from a simple SVG path string (see `parsePathD`). Skia's own
 * string parser is not available on every platform (the web build lacks it).
 */
export function pathFromD(d: string): SkPath {
  const path = Skia.Path.Make();
  for (const c of parsePathD(d)) {
    if (c.op === 'M') path.moveTo(c.x, c.y);
    else if (c.op === 'L') path.lineTo(c.x, c.y);
    else if (c.op === 'C') path.cubicTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y);
    else path.close();
  }
  return path;
}
