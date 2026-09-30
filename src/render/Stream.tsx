import React from 'react';
import { Path, Skia } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { BoardAnim } from './TubeCanvas';
import { TUBE_PAD } from './glassPaint';
import { streamAt } from './pourStream';

/** Liquid stream from the pouring tube's lip down to the destination surface. */
export const Stream = React.memo(function Stream({ anim, reduceMotion }: { anim: BoardAnim; reduceMotion: boolean }) {
  const geo = useDerivedValue(() => {
    const pl = anim.plan.value;
    return pl ? streamAt(pl, anim.clock.value, TUBE_PAD) : null;
  });
  const path = useDerivedValue(() => {
    const g = geo.value;
    const p = Skia.Path.Make();
    if (!g || !g.visible) return p;
    const wob = Math.sin(anim.phase.value * 14) * 1.4;
    p.moveTo(g.x0, g.y0);
    p.cubicTo(g.x0 + (g.x1 - g.x0) * 0.1 + wob, g.y0 + (g.y1 - g.y0) * 0.35,
      g.x1 - wob, g.y0 + (g.y1 - g.y0) * 0.7, g.x1, g.y1);
    return p;
  });
  const color = useDerivedValue(() => anim.plan.value?.hex ?? '#FFFFFF');
  const opacity = useDerivedValue(() => geo.value?.alpha ?? 0);
  const width = useDerivedValue(() => geo.value?.width ?? 0);
  if (reduceMotion) return null;
  return (
    <>
      <Path path={path} style="stroke" strokeWidth={width} strokeCap="round" color={color} opacity={opacity} />
      <Path path={path} style="stroke" strokeWidth={useDerivedValue(() => width.value * 0.3)} strokeCap="round"
        color="rgba(255,255,255,0.55)" opacity={opacity} />
    </>
  );
});
