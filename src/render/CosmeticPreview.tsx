import React, { useEffect, useMemo } from 'react';
import { Canvas } from '@shopify/react-native-skia';
import { Easing, useFrameCallback, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { LIQUID_HEX } from '../config/theme';
import type { TubeState } from '../game/types';
import type { Plan } from './plan';
import { pourEffectOf, Stream } from './Stream';
import { ThemeBackdrop } from './ThemeBackdrop';
import { TubeCanvas } from './TubeCanvas';
import type { BoardAnim } from './TubeCanvas';
import { TUBE_PAD } from './glassPaint';
import { pourTarget, pourTimeline } from './pourGeometry';
import { skinFor } from './skins';
import { themeFor } from './themes';
import { useReduceMotion } from '../store/settingsStore';

const mk = (id: string, colors: ('red' | 'blue')[]): TubeState => ({
  id, capacity: 4, liquids: colors.map((color) => ({ color })), locked: false, sealed: false, catalystSpent: false, isExtra: false,
});
const SRC = mk('p1', ['red', 'blue', 'blue']);
const DST = mk('p2', ['blue']);
const HOLD_MS = 700;

interface Props { skinId: string; themeId: string; effectId: string; width: number; height: number }

/**
 * Live preview of a tube skin, lab theme and pour effect: a looping pour drawn
 * with the same tube and stream components the game uses (§12.5). Equipped
 * and unowned items can both be previewed; previews change nothing.
 */
export function CosmeticPreview({ skinId, themeId, effectId, width, height }: Props) {
  const reduce = useReduceMotion();
  const tubeW = Math.min(46, width * 0.14);
  // leave headroom above the tubes: the pouring tube tips its far corner upward
  const tubeH = Math.min(height - 74, 150);
  const unitH = (tubeH - 2 * TUBE_PAD) / 4;
  const y = height - tubeH - 12;
  const src = useMemo(() => ({ x: width * 0.3 - tubeW / 2, y }), [width, tubeW, y]);
  const dst = useMemo(() => ({ x: width * 0.7 - tubeW / 2, y }), [width, tubeW, y]);

  const tl = useMemo(() => pourTimeline(2), []);
  const plan = useSharedValue<Plan | null>(null);
  const clock = useSharedValue(0);
  const phase = useSharedValue(0);
  useFrameCallback((info) => { if (!reduce) phase.value += Math.min(0.05, (info.timeSincePreviousFrame ?? 16) / 1000); });
  const anim = useMemo<BoardAnim>(() => ({ plan, clock, phase }), [plan, clock, phase]);

  useEffect(() => {
    const target = pourTarget({ srcX: src.x, srcY: src.y, dstX: dst.x, dstY: dst.y, tubeW, tubeH, fullness: 0.75, dir: 1 });
    plan.value = {
      kind: 'pour', from: 0, to: 1, amount: 2, srcKeep: 1, dstStart: 1, color: 'blue', hex: LIQUID_HEX.blue,
      total: tl.total, tl, target, dir: 1, src, dst, tubeW, tubeH, unitH,
    };
    if (reduce) { clock.value = tl.total; return; }
    clock.value = 0;
    clock.value = withRepeat(withTiming(tl.total + HOLD_MS, { duration: tl.total + HOLD_MS, easing: Easing.linear }), -1, false);
  }, [src, dst, tubeW, tubeH, unitH, reduce, plan, clock, tl]);

  const skin = skinFor(skinId);
  const theme = themeFor(themeId);
  const common = {
    tubeW, tubeH, unitH, anim, palette: LIQUID_HEX, skin, patterns: false, labels: false, highContrast: false,
    reduceMotion: reduce, font: null, selected: false, shakeNonce: 0, flourishNonce: 0, wobbleNonce: 0,
  } as const;

  return (
    <Canvas style={{ width, height }} accessible accessibilityLabel="Preview">
      <ThemeBackdrop theme={theme} width={width} height={height} />
      <TubeCanvas {...common} index={1} tube={DST} x={dst.x} y={dst.y} />
      <TubeCanvas {...common} index={0} tube={SRC} x={src.x} y={src.y} />
      <Stream anim={anim} reduceMotion={reduce} effect={pourEffectOf(effectId)} />
    </Canvas>
  );
}
