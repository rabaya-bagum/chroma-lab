import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { theme } from '../config/theme';
import { useReduceMotion } from '../store/settingsStore';

interface Cell { x: number; y: number; w: number; h: number }

function Ring({ cell }: { cell: Cell }) {
  const reduce = useReduceMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) { t.value = 1; return; }
    t.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [reduce, t]);
  const style = useAnimatedStyle(() => ({ opacity: 0.45 + 0.55 * t.value, transform: [{ scale: 1 + 0.04 * t.value }] }));
  return <Animated.View style={[styles.ring, { pointerEvents: 'none' }, { left: cell.x + 2, top: cell.y + 2, width: cell.w - 4, height: cell.h - 4 }, style]} />;
}

/** Pulsing rings over tube cells (tutorial now, hints in Phase 4). */
export function HintRings({ cells, tubes }: { cells: Cell[]; tubes: number[] }) {
  return <>{tubes.map((i) => (cells[i] ? <Ring key={i} cell={cells[i]} /> : null))}</>;
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', borderRadius: 16, borderWidth: 2, borderColor: theme.accent, backgroundColor: 'rgba(39,227,242,0.07)' },
});
