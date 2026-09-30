/** Responsive board layout (§8). Pure so it can be unit tested. */

export interface BoardLayout {
  cols: number;
  rows: number;
  tubeW: number;
  tubeH: number;
  unitH: number;
  /** Top-left of each tube's rest position, in board coordinates. */
  positions: { x: number; y: number }[];
  /** Full tap cell for each tube (whole column incl. padding, at least 48x48). */
  cells: { x: number; y: number; w: number; h: number }[];
  width: number;
  height: number;
  /** Extra headroom above each row for the selection lift. */
  lift: number;
}

export const TABLET_MIN_WIDTH = 600;
export const MIN_TAP = 48;
const TUBE_ASPECT_MAX = 1.0;   // unit height never exceeds unit width * this
const TUBE_PAD = 6;            // glass padding above/below the liquid stack

export function maxColumns(width: number): number {
  if (width >= 900) return 7;
  if (width >= TABLET_MIN_WIDTH) return 6;
  return width < 380 ? 4 : 5;
}

/** Split `n` tubes into rows as evenly as possible, never exceeding `maxCols` per row. */
export function rowSizes(n: number, maxCols: number): number[] {
  if (n <= 0) return [];
  const rows = Math.ceil(n / maxCols);
  const base = Math.ceil(n / rows);
  const sizes: number[] = [];
  let left = n;
  for (let r = 0; r < rows; r++) {
    const c = Math.min(base, left);
    sizes.push(c);
    left -= c;
  }
  return sizes;
}

export function computeLayout(
  width: number,
  height: number,
  tubeCount: number,
  capacity = 4,
): BoardLayout {
  const sizes = rowSizes(tubeCount, maxColumns(width));
  const rows = Math.max(1, sizes.length);
  const cols = Math.max(1, ...sizes);
  const cellW = width / cols;
  const lift = 14;
  const rowH = height / rows;

  const tubeW = Math.max(24, Math.min(cellW * 0.6, 64));
  const unitFromWidth = (tubeW - 8) * TUBE_ASPECT_MAX;
  const unitFromHeight = (rowH - lift - 16 - 2 * TUBE_PAD) / capacity;
  const unitH = Math.max(12, Math.min(unitFromWidth, unitFromHeight));
  const tubeH = unitH * capacity + 2 * TUBE_PAD;

  const positions: BoardLayout['positions'] = [];
  const cells: BoardLayout['cells'] = [];
  const blockH = tubeH + lift;
  const top = Math.max(0, (height - rows * rowH) / 2);
  sizes.forEach((count, r) => {
    const rowW = count * cellW;
    const left = (width - rowW) / 2; // centre a partial row
    for (let c = 0; c < count; c++) {
      const cx = left + c * cellW;
      const y = top + r * rowH + (rowH - blockH) / 2 + lift;
      positions.push({ x: cx + (cellW - tubeW) / 2, y });
      const cw = Math.max(cellW, MIN_TAP);
      const ch = Math.max(rowH, MIN_TAP);
      cells.push({ x: cx + (cellW - cw) / 2, y: top + r * rowH + (rowH - ch) / 2, w: cw, h: ch });
    }
  });
  return { cols, rows, tubeW, tubeH, unitH, positions, cells, width, height, lift };
}
