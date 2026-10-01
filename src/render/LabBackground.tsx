import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { BlurMask, Canvas, Group, LinearGradient, Path, RadialGradient, Rect, RoundedRect, Skia, vec } from '@shopify/react-native-skia';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { LIQUID_HEX } from '../config/theme';
import { TUBE_PAD, tubePaths } from './glassPaint';
import { useReduceMotion } from '../store/settingsStore';

const PARTICLES = 22;
const DECOR = [
  { color: LIQUID_HEX.cyan, level: 0.62, x: 0.18 },
  { color: LIQUID_HEX.purple, level: 0.4, x: 0.5 },
  { color: LIQUID_HEX.green, level: 0.78, x: 0.82 },
];

// deterministic pseudo-random per index so the layout is stable between renders
const rnd = (i: number, k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

/**
 * Home background: a dim lab bench with blurred equipment silhouettes, decorative
 * tubes with the occasional bubble, and slow ambient particles. With Reduce Motion
 * it is drawn once and nothing moves (§12.1, §13).
 */
export function LabBackground() {
  const reduce = useReduceMotion();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const t = useSharedValue(0);
  useFrameCallback((info) => { if (!reduce) t.value += Math.min(0.05, (info.timeSincePreviousFrame ?? 16) / 1000); });

  const { w, h } = size;
  const benchY = h * 0.8;
  const tubeW = Math.min(52, w * 0.13);
  const tubeH = Math.min(190, h * 0.26);
  const paths = useMemo(() => tubePaths(tubeW, tubeH), [tubeW, tubeH]);

  const particles = useDerivedValue(() => {
    const p = Skia.Path.Make();
    for (let i = 0; i < PARTICLES; i++) {
      const speed = 6 + rnd(i, 1) * 10;
      const y = ((rnd(i, 2) * h - t.value * speed) % h + h) % h;
      const x = rnd(i, 3) * w + Math.sin(t.value * 0.4 + i) * 12;
      p.addCircle(x, y, 1 + rnd(i, 4) * 1.8);
    }
    return p;
  });
  const bubbles = useDerivedValue(() => {
    const p = Skia.Path.Make();
    DECOR.forEach((d, i) => {
      for (let k = 0; k < 2; k++) {
        const cycle = (t.value * 0.18 + rnd(i, k + 7)) % 1;
        const top = tubeH - TUBE_PAD - d.level * (tubeH - 2 * TUBE_PAD);
        const y = tubeH - TUBE_PAD - cycle * (tubeH - TUBE_PAD - top);
        p.addCircle(tubeW / 2 + Math.sin(cycle * 6 + k) * tubeW * 0.15, y, 1.6 + k);
      }
    });
    return p;
  });

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none">
      {w > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          <Rect x={0} y={0} width={w} height={h}>
            <LinearGradient start={vec(0, 0)} end={vec(0, h)} colors={['#0B1430', '#070B18']} />
          </Rect>
          <Rect x={0} y={0} width={w} height={h}>
            <RadialGradient c={vec(w / 2, h * 0.38)} r={Math.max(w, h) * 0.6} colors={['rgba(39,227,242,0.16)', 'rgba(39,227,242,0)']} />
          </Rect>

          {/* blurred equipment silhouettes at the back of the bench */}
          <Group opacity={0.55}>
            <RoundedRect x={w * 0.06} y={benchY - h * 0.2} width={w * 0.2} height={h * 0.2} r={10} color="#1A2A52"><BlurMask blur={8} style="normal" /></RoundedRect>
            <RoundedRect x={w * 0.34} y={benchY - h * 0.1} width={w * 0.14} height={h * 0.1} r={8} color="#16224A"><BlurMask blur={8} style="normal" /></RoundedRect>
            <RoundedRect x={w * 0.7} y={benchY - h * 0.24} width={w * 0.22} height={h * 0.24} r={14} color="#1A2A52"><BlurMask blur={10} style="normal" /></RoundedRect>
          </Group>

          {/* bench */}
          <Rect x={0} y={benchY} width={w} height={h - benchY}>
            <LinearGradient start={vec(0, benchY)} end={vec(0, h)} colors={['#1A2547', '#0A1022']} />
          </Rect>
          <Rect x={0} y={benchY} width={w} height={2} color="rgba(150,190,255,0.35)" />

          {/* decorative tubes */}
          {DECOR.map((d, i) => (
            <Group key={i} transform={[{ translateX: d.x * w - tubeW / 2 }, { translateY: benchY - tubeH + 2 }]} opacity={0.9}>
              <Group clip={paths.body}>
                <Rect x={0} y={tubeH - TUBE_PAD - d.level * (tubeH - 2 * TUBE_PAD)} width={tubeW} height={tubeH} color={d.color} opacity={0.85} />
                <Rect x={0} y={0} width={tubeW} height={tubeH}>
                  <LinearGradient start={vec(0, 0)} end={vec(tubeW, 0)} colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.3)']} />
                </Rect>
              </Group>
              <Path path={paths.outline} style="stroke" strokeWidth={1.4} color="rgba(190,215,255,0.7)" />
              <Path path={paths.highlight} color="rgba(255,255,255,0.3)" />
            </Group>
          ))}
          <Group transform={[{ translateY: benchY - tubeH + 2 }]}>
            {DECOR.map((d, i) => (
              <Group key={i} transform={[{ translateX: d.x * w - tubeW / 2 }]}>
                <Path path={bubbles} style="stroke" strokeWidth={1} color="rgba(255,255,255,0.6)" />
              </Group>
            ))}
          </Group>

          <Path path={particles} color="rgba(190,230,255,0.45)" />
        </Canvas>
      )}
    </View>
  );
}
