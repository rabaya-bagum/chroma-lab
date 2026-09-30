import type { LiquidColor } from '../game/types';

/** Base hues from §7.4; tuned in later phases. */
export const LIQUID_HEX: Record<LiquidColor, string> = {
  red: '#E8384F',
  blue: '#2F6BFF',
  yellow: '#FFE14D',
  green: '#1FD18B',
  purple: '#8447FF',
  orange: '#FF8A1F',
  cyan: '#27E3F2',
  pink: '#FF4FB8',
};

/** Palette for colour-blind mode (Okabe-Ito based; distinguishable for deuteranopia and protanopia). */
export const LIQUID_HEX_COLORBLIND: Record<LiquidColor, string> = {
  red: '#D55E00',
  blue: '#0072B2',
  yellow: '#F0E442',
  green: '#009E73',
  purple: '#CC79A7',
  orange: '#E69F00',
  cyan: '#56B4E9',
  pink: '#F2F2F2',
};

/** WCAG relative luminance of a #RRGGBB colour. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const x = relativeLuminance(a), y = relativeLuminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export const COLOR_NAMES: Record<LiquidColor, string> = {
  red: 'Crimson', blue: 'Electric Blue', yellow: 'Neon Yellow', green: 'Emerald',
  purple: 'Violet', orange: 'Orange', cyan: 'Cyan', pink: 'Magenta',
};

export const theme = {
  bg: '#0A1020',
  panel: '#121B33',
  glass: '#1B2747',
  glassEdge: '#3C5A9A',
  text: '#E8EEFF',
  textDim: '#8A98BD',
  accent: '#27E3F2',
  warn: '#FF8A1F',
};
