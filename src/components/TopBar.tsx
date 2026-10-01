import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../config/theme';
import { Icon } from './Icon';
import { CoinDisplay } from './CoinDisplay';
import { StarRow } from './StarRow';

interface Props { levelNumber: number; moves: number; stars: number; coins: number; onBack(): void }

export function TopBar({ levelNumber, moves, stars, coins, onBack }: Props) {
  return (
    <View style={styles.bar}>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to levels" style={styles.back}>
        <Icon name="back" size={24} />
      </Pressable>
      <View style={styles.center}>
        <Text maxFontSizeMultiplier={1.3} style={styles.title} accessibilityRole="header">LEVEL {levelNumber}</Text>
        <StarRow count={stars} size={16} />
      </View>
      <View style={styles.right}>
        <CoinDisplay coins={coins} />
        <View accessible accessibilityLabel={`${moves} moves`} style={styles.movesBox}>
          <Text maxFontSizeMultiplier={1.3} style={styles.moveLabel}>MOVES</Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.moves}>{moves}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 8 },
  back: { width: 72, height: 48, alignItems: 'flex-start', justifyContent: 'center' },
  center: { alignItems: 'center', gap: 4 },
  title: { color: theme.text, fontSize: 18, fontWeight: '800', letterSpacing: 3 },
  right: { minWidth: 72, alignItems: 'flex-end' },
  movesBox: { alignItems: 'flex-end' },
  moveLabel: { color: theme.textDim, fontSize: 10, letterSpacing: 1.5 },
  moves: { color: theme.text, fontSize: 18, fontWeight: '700' },
});
