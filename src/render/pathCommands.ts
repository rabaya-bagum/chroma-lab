export type PathCommand =
  | { op: 'M' | 'L'; x: number; y: number }
  | { op: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { op: 'Z' };

/**
 * Parse an SVG path string limited to absolute M, L, H, V, C and Z into plain
 * commands (H and V become L). Pure, so it can be tested without Skia.
 */
export function parsePathD(d: string): PathCommand[] {
  const tokens = d.match(/[MLHVCZ]|-?\d*\.?\d+/g) ?? [];
  const out: PathCommand[] = [];
  let i = 0, cmd = '', x = 0, y = 0;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/[MLHVCZ]/.test(tokens[i])) cmd = tokens[i++];
    switch (cmd) {
      case 'M': x = num(); y = num(); out.push({ op: 'M', x, y }); cmd = 'L'; break;
      case 'L': x = num(); y = num(); out.push({ op: 'L', x, y }); break;
      case 'H': x = num(); out.push({ op: 'L', x, y }); break;
      case 'V': y = num(); out.push({ op: 'L', x, y }); break;
      case 'C': { const x1 = num(), y1 = num(), x2 = num(), y2 = num(); x = num(); y = num(); out.push({ op: 'C', x1, y1, x2, y2, x, y }); break; }
      case 'Z': out.push({ op: 'Z' }); break;
      default: i++;
    }
  }
  return out;
}
