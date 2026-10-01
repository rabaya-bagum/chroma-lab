/** Linear blend of two #RRGGBB colours (t = 0 gives a, t = 1 gives b). Runs as a worklet. */
export function mixHex(a: string, b: string, t: number): string {
  'worklet';
  const k = t < 0 ? 0 : t > 1 ? 1 : t;
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => {
    const x = (pa >> shift) & 255, y = (pb >> shift) & 255;
    const v = Math.round(x + (y - x) * k);
    return (v < 16 ? '0' : '') + v.toString(16);
  };
  return '#' + ch(16) + ch(8) + ch(0);
}

/** True if bit k is set in `mask`. */
export function hasBit(mask: number, k: number): boolean {
  'worklet';
  return ((mask >> k) & 1) === 1;
}

/** Bitmask of the layers (by index) for which `pick` is true. */
export function bitsOf<T>(items: readonly T[], pick: (x: T) => boolean | undefined): number {
  let m = 0;
  items.forEach((x, k) => { if (pick(x)) m |= 1 << k; });
  return m;
}
