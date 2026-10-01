import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { Canvas, Group, LinearGradient, Path, RoundedRect, Skia, vec } from '@shopify/react-native-skia';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { theme } from '../config/theme';
import { useReduceMotion } from '../store/settingsStore';

/** CHROMA LAB wordmark over a softly moving band of glowing liquid. */
export function Logo({ compact = false }: { compact?: boolean }) {
  const reduce = useReduceMotion();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const t = useSharedValue(0);
  useFrameCallback((i) => { if (!reduce) t.value += Math.min(0.05, (i.timeSincePreviousFrame ?? 16) / 1000); });
  const { w, h } = size;
  const wave = useDerivedValue(() => {
    const p = Skia.Path.Make();
    if (w <= 0) return p;
    const base = h * 0.45;
    p.moveTo(0, h);
    for (let x = 0; x <= w; x += 6) p.lineTo(x, base + Math.sin(x / 28 + t.value * 1.6) * 4 + Math.sin(x / 11 - t.value * 2.1) * 1.5);
    p.lineTo(w, h);
    p.close();
    return p;
  });
  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  return (
    <View style={[styles.box, compact && styles.compact]} onLayout={onLayout} accessible accessibilityRole="header" accessibilityLabel="Chroma Lab">
      {w > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          <Group clip={Skia.RRectXY(Skia.XYWHRect(0, 0, w, h), 16, 16)}>
            <Path path={wave}>
              <LinearGradient start={vec(0, 0)} end={vec(w, 0)} colors={['rgba(39,227,242,0.55)', 'rgba(47,107,255,0.5)', 'rgba(155,92,255,0.5)']} />
            </Path>
          </Group>
          <RoundedRect x={0.5} y={0.5} width={w - 1} height={h - 1} r={16} style="stroke" strokeWidth={1} color="rgba(190,215,255,0.45)" />
        </Canvas>
      )}
      <Text maxFontSizeMultiplier={1.3} style={[styles.text, compact && { fontSize: 24 }]}>CHROMA LAB</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { minWidth: 260, height: 84, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  compact: { height: 60, minWidth: 200 },
  text: { color: theme.text, fontSize: 32, fontWeight: '800', letterSpacing: 6, textShadowColor: 'rgba(39,227,242,0.8)', textShadowRadius: 12 },
});
