/** Colour helpers for liquid shading. */

function parse(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

/** amount > 0 lightens towards white, amount < 0 darkens towards black. */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = parse(hex);
  const t = amount < 0 ? 0 : 255;
  const k = Math.abs(amount);
  return toHex(r + (t - r) * k, g + (t - g) * k, b + (t - b) * k);
}

/** Ink colour (dark or light) that reads on top of `hex`; used for labels and patterns. */
export function inkFor(hex: string): string {
  const [r, g, b] = parse(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#0A1020' : '#FFFFFF';
}
