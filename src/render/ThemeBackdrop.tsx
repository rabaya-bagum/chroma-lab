import React, { useMemo } from 'react';
import { Group, LinearGradient, Path, RadialGradient, Rect, Skia, vec } from '@shopify/react-native-skia';
import type { LabTheme } from './themes';

const rnd = (i: number, k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

/** Themed background drawn inside a Skia canvas: gradient, glow and the theme's decoration. */
export function ThemeBackdrop({ theme, width, height, solid = false }: { theme: LabTheme; width: number; height: number; solid?: boolean }) {
  const decor = useMemo(() => {
    const p = Skia.PathBuilder.Make();
    if (theme.decor === 'stars') {
      for (let i = 0; i < 46; i++) p.addCircle(rnd(i, 1) * width, rnd(i, 2) * height, 0.5 + rnd(i, 3) * 1.4);
    } else if (theme.decor === 'grid') {
      const step = Math.max(28, width / 9);
      for (let x = 0; x <= width; x += step) { p.moveTo(x, 0); p.lineTo(x, height); }
      for (let y = 0; y <= height; y += step) { p.moveTo(0, y); p.lineTo(width, y); }
    }
    return p.build();
  }, [theme.decor, width, height]);

  return (
    <Group>
      <Rect x={0} y={0} width={width} height={height} color={solid ? '#000814' : undefined}>
        {!solid && <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={[theme.top, theme.bottom]} />}
      </Rect>
      {!solid && (
        <Rect x={0} y={0} width={width} height={height}>
          <RadialGradient c={vec(width / 2, height * 0.45)} r={Math.max(width, height) * 0.6} colors={[theme.glow, theme.glowOuter]} />
        </Rect>
      )}
      {!solid && theme.decor === 'stars' && <Path path={decor} color="rgba(235,225,255,0.75)" />}
      {!solid && theme.decor === 'grid' && <Path path={decor} style="stroke" strokeWidth={1} color="rgba(39,227,242,0.09)" />}
    </Group>
  );
}
