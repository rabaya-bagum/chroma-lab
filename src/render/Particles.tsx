import React from 'react';
import { Path, Skia } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { KIND_BUBBLE, KIND_SPARK, liveOfKind } from './particles';

/** Draws the pooled particles: bubbles as rings, sparks as filled dots. */
export const Particles = React.memo(function Particles({ state }: { state: SharedValue<number[]> }) {
  const bubbles = useDerivedValue(() => {
    const p = Skia.Path.Make();
    for (const b of liveOfKind(state.value, KIND_BUBBLE)) p.addCircle(b.x, b.y, b.r);
    return p;
  });
  const sparks = useDerivedValue(() => {
    const p = Skia.Path.Make();
    for (const s of liveOfKind(state.value, KIND_SPARK)) p.addCircle(s.x, s.y, s.r);
    return p;
  });
  return (
    <>
      <Path path={bubbles} style="stroke" strokeWidth={1} color="rgba(255,255,255,0.7)" />
      <Path path={sparks} style="fill" color="#FFF1B8" />
    </>
  );
});
