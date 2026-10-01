import React from 'react';
import { BlurMask, Path, Skia } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { BoardAnim } from './TubeCanvas';
import { TUBE_PAD } from './glassPaint';
import { streamAt } from './pourStream';

/** Liquid stream from the pouring tube's lip down to the destination surface. */
export type PourEffect = 'classic' | 'sparkle' | 'plasma';
export const pourEffectOf = (id: string): PourEffect => (id === 'pour.sparkle' ? 'sparkle' : id === 'pour.plasma' ? 'plasma' : 'classic');

export const Stream = React.memo(function Stream({ anim, reduceMotion, effect = 'classic' }: { anim: BoardAnim; reduceMotion: boolean; effect?: PourEffect }) {
  const geo = useDerivedValue(() => {
    const pl = anim.plan.value;
    return pl ? streamAt(pl, anim.clock.value, TUBE_PAD) : null;
  });
  const path = useDerivedValue(() => {
    const g = geo.value;
    const p = Skia.PathBuilder.Make();
    if (!g || !g.visible) return p.build();
    const wob = Math.sin(anim.phase.value * 14) * 1.4;
    p.moveTo(g.x0, g.y0);
    p.cubicTo(g.x0 + (g.x1 - g.x0) * 0.1 + wob, g.y0 + (g.y1 - g.y0) * 0.35,
      g.x1 - wob, g.y0 + (g.y1 - g.y0) * 0.7, g.x1, g.y1);
    return p.build();
  });
  // sparkle: glints riding down the stream
  const glints = useDerivedValue(() => {
    const g = geo.value;
    const p = Skia.PathBuilder.Make();
    if (!g || !g.visible || effect !== 'sparkle') return p.build();
    for (let i = 0; i < 7; i++) {
      const t = (anim.phase.value * 1.6 + i / 7) % 1;
      const x = g.x0 + (g.x1 - g.x0) * t + Math.sin(i * 3 + anim.phase.value * 9) * g.width * 0.9;
      p.addCircle(x, g.y0 + (g.y1 - g.y0) * t, 1.2 + (i % 3) * 0.6);
    }
    return p.build();
  });
  // plasma: a jagged arc around the stream core
  const arc = useDerivedValue(() => {
    const g = geo.value;
    const p = Skia.PathBuilder.Make();
    if (!g || !g.visible || effect !== 'plasma') return p.build();
    const n = 9;
    p.moveTo(g.x0, g.y0);
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const jitter = i === n ? 0 : Math.sin(anim.phase.value * 31 + i * 5.1) * g.width * 1.3;
      p.lineTo(g.x0 + (g.x1 - g.x0) * t + jitter, g.y0 + (g.y1 - g.y0) * t);
    }
    return p.build();
  });
  const color = useDerivedValue(() => anim.plan.value?.hex ?? '#FFFFFF');
  const opacity = useDerivedValue(() => geo.value?.alpha ?? 0);
  const width = useDerivedValue(() => geo.value?.width ?? 0);
  const coreWidth = useDerivedValue(() => width.value * 0.3);
  const glowWidth = useDerivedValue(() => width.value * 2.4);
  if (reduceMotion) return null;
  return (
    <>
      {effect === 'plasma' && (
        <Path path={path} style="stroke" strokeWidth={glowWidth} strokeCap="round" color="#B58CFF" opacity={opacity}>
          <BlurMask blur={7} style="normal" />
        </Path>
      )}
      <Path path={path} style="stroke" strokeWidth={width} strokeCap="round" color={color} opacity={opacity} />
      <Path path={path} style="stroke" strokeWidth={coreWidth} strokeCap="round"
        color="rgba(255,255,255,0.55)" opacity={opacity} />
      {effect === 'sparkle' && <Path path={glints} color="#FFF6C8" opacity={opacity} />}
      {effect === 'plasma' && <Path path={arc} style="stroke" strokeWidth={1.4} color="#E8DBFF" opacity={opacity} />}
    </>
  );
});
