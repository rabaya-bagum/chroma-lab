import type { LiquidColor } from '../game/types';

/** Base hues from §7.4; tuned in later phases. */
export const LIQUID_HEX: Record<LiquidColor, string> = {
  red: '#E8384F',
  blue: '#2F6BFF',
  yellow: '#FFE14D',
  green: '#1FD18B',
  purple: '#9B5CFF',
  orange: '#FF8A1F',
  cyan: '#27E3F2',
  pink: '#FF4FB8',
};

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
