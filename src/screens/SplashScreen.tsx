import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Canvas, Group, LinearGradient, Path, Rect, vec } from '@shopify/react-native-skia';
import { Easing, runOnJS, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { theme } from '../config/theme';
import { TUBE_PAD, tubePaths } from '../render/glassPaint';
import { useReduceMotion } from '../store/settingsStore';

export const SPLASH_FILL_MS = 1200; // spec: at most 1.5 s

/** Logo and a tube that fills with liquid while saves and assets load (§12.2). */
export function SplashScreen({ onFilled, onLayout }: { onFilled(): void; onLayout?: () => void }) {
  const reduce = useReduceMotion();
  const fill = useSharedValue(reduce ? 1 : 0);
  const W = 64, H = 150;
  const paths = useMemo(() => tubePaths(W, H), []);

  useEffect(() => {
    if (reduce) { onFilled(); return; }
    fill.value = withTiming(1, { duration: SPLASH_FILL_MS, easing: Easing.inOut(Easing.cubic) }, (done) => {
      if (done) runOnJS(onFilled)();
    });
  }, [reduce, fill, onFilled]);

  const y = useDerivedValue(() => H - TUBE_PAD - fill.value * (H - 2 * TUBE_PAD));
  const wave = useDerivedValue(() => {
    const top = y.value;
    return `M 0 ${top} Q ${W * 0.25} ${top - 3} ${W * 0.5} ${top} T ${W} ${top} V ${H} H 0 Z`;
  });

  return (
    <View style={styles.root} onLayout={onLayout}>
      <Canvas style={{ width: W, height: H }}>
        <Group clip={paths.body}>
          <Path path={wave}>
            <LinearGradient start={vec(0, 0)} end={vec(0, H)} colors={['#27E3F2', '#2F6BFF', '#9B5CFF']} />
          </Path>
          <Rect x={0} y={0} width={W} height={H}>
            <LinearGradient start={vec(0, 0)} end={vec(W, 0)} colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.3)']} />
          </Rect>
        </Group>
        <Path path={paths.outline} style="stroke" strokeWidth={1.6} color="rgba(190,215,255,0.8)" />
        <Path path={paths.highlight} color="rgba(255,255,255,0.35)" />
      </Canvas>
      <Text maxFontSizeMultiplier={1.3} style={styles.text}>CHROMA LAB</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, backgroundColor: theme.bg },
  text: { color: theme.text, fontSize: 28, fontWeight: '800', letterSpacing: 6 },
});
