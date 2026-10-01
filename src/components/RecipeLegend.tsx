import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLOR_NAMES, LIQUID_HEX, LIQUID_HEX_COLORBLIND } from '../config/theme';
import type { Level, LiquidColor } from '../game/types';
import { useSettingsStore } from '../store/settingsStore';

/** The level's mixing recipes as "red + blue = purple" with colour dots (chapter 6). */
export function RecipeLegend({ level }: { level: Level }) {
  const colorBlind = useSettingsStore((s) => s.colorBlind);
  const pairs = level.rules?.mixing?.pairs;
  if (!pairs || pairs.length === 0) return null;
  const palette: Record<LiquidColor, string> = colorBlind ? LIQUID_HEX_COLORBLIND : LIQUID_HEX;
  const label = pairs.map((p) => `${COLOR_NAMES[p.a]} plus ${COLOR_NAMES[p.b]} makes ${COLOR_NAMES[p.result]}`).join('. ');
  const Dot = ({ c }: { c: LiquidColor }) => <View style={[styles.dot, { backgroundColor: palette[c] }]} />;
  return (
    <View style={styles.row} accessible accessibilityLabel={`Recipes. ${label}.`}>
      {pairs.map((p) => (
        <View key={`${p.a}${p.b}`} style={styles.recipe}>
          <Dot c={p.a} /><Text style={styles.op}>+</Text><Dot c={p.b} /><Text style={styles.op}>=</Text><Dot c={p.result} />
          <Text maxFontSizeMultiplier={1.3} style={styles.name}>{COLOR_NAMES[p.result]}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginHorizontal: 16, marginBottom: 6 },
  recipe: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)' },
  op: { color: '#9FB3D9', fontSize: 12, fontWeight: '700' },
  name: { color: '#9FB3D9', fontSize: 11, marginLeft: 2 },
});
