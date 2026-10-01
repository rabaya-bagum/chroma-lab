import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../config/theme';
import { describeMechanics } from '../game/mechanicsText';
import type { Level } from '../game/types';

/** The level's special rules in plain language (empty for classic levels). */
export function MechanicsNote({ level }: { level: Level }) {
  const lines = describeMechanics(level).filter((l) => !l.startsWith('Reactor'));
  if (lines.length === 0) return null;
  return (
    <View style={styles.box} accessible accessibilityLabel={`Level rules. ${lines.join(' ')}`}>
      {lines.map((l) => <Text key={l} maxFontSizeMultiplier={1.3} style={styles.text}>{l}</Text>)}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginHorizontal: 16, marginBottom: 6, gap: 2 },
  text: { color: theme.textDim, fontSize: 12, textAlign: 'center' },
});
