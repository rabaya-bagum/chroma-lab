import React from 'react';
import Svg, { Path } from 'react-native-svg';

// 24x24 stroked icons (no icon font, no emoji). Drawn with react-native-svg rather
// than Skia so lists with many icons do not each need a GPU surface.
const PATHS = {
  undo: 'M9 6 L4 11 L9 16 M4 11 H15 C19 11 21 14 21 18',
  restart: 'M20 12 A8 8 0 1 1 17.5 6.3 M17.5 2.5 V6.5 H13.5',
  hint: 'M9 18 H15 M10 21 H14 M12 3 C8 3 6 6 6 9 C6 11.5 7.5 12.5 8.5 14 C9 15 9 15.5 9 16 H15 C15 15.5 15 15 15.5 14 C16.5 12.5 18 11.5 18 9 C18 6 16 3 12 3 Z',
  tube: 'M8 3 V16 A4 4 0 0 0 16 16 V3 M12 9 V15 M9 12 H15',
  back: 'M15 5 L8 12 L15 19',
  lock: 'M7 11 V8 A5 5 0 0 1 17 8 V11 M5 11 H19 V21 H5 Z M12 15 V17',
  gear: 'M12 8 A4 4 0 1 0 12 16 A4 4 0 1 0 12 8 M12 2 V5 M12 19 V22 M2 12 H5 M19 12 H22 M5 5 L7 7 M17 17 L19 19 M5 19 L7 17 M17 7 L19 5',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 24, color = '#E8EEFF' }: { name: IconName; size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={{ pointerEvents: 'none' }}>
      <Path d={PATHS[name]} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
