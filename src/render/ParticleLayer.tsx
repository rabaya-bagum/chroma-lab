import React from 'react';
import { Path, Skia } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { addCirclesOfKind, KIND_BUBBLE, KIND_SPARK } from './particles';

/** Draws the pooled particles: bubbles as rings, sparks as filled dots. */
export const Particles = React.memo(function Particles({ state }: { state: SharedValue<number[]> }) {
  const bubbles = useDerivedValue(() => {
    const p = Skia.PathBuilder.Make();
    addCirclesOfKind(state.value, KIND_BUBBLE, p);
    return p.build();
  });
  const sparks = useDerivedValue(() => {
    const p = Skia.PathBuilder.Make();
    addCirclesOfKind(state.value, KIND_SPARK, p);
    return p.build();
  });
  return (
    <>
      <Path path={bubbles} style="stroke" strokeWidth={1} color="rgba(255,255,255,0.7)" />
      <Path path={sparks} style="fill" color="#FFF1B8" />
    </>
  );
});
