import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../config/theme';
import { reactorMeter } from '../game/reactor';
import type { Level } from '../game/types';

/**
 * Reactor level meter (section 11.5). It fills per move, never per second, so there
 * is no time pressure. Past the limit it reads "Stabilised": the bonus is lost and play continues.
 */
export function ReactorMeter({ level, moves }: { level: Level; moves: number }) {
  const m = reactorMeter(level, moves);
  if (!m) return null;
  const color = m.stabilised ? theme.textDim : m.fill > 0.75 ? theme.warn : theme.accent;
  const label = m.stabilised ? 'STABILISED' : `REACTOR  ${m.moves} / ${m.limit}`;
  const spoken = m.stabilised
    ? 'Reactor stabilised. The bonus is lost, but you can keep playing.'
    : `Reactor ${m.moves} of ${m.limit} moves. Finish in time for ${m.bonusCoins} bonus coins.`;
  return (
    <View style={styles.wrap} accessible accessibilityLabel={spoken} accessibilityLiveRegion="polite">
      <View style={styles.bar}><View style={[styles.fill, { width: `${Math.round(m.fill * 100)}%`, backgroundColor: color }]} /></View>
      <Text maxFontSizeMultiplier={1.3} style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginBottom: 6, gap: 4 },
  bar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(150,190,255,0.15)', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 2, textAlign: 'center' },
});
