import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../config/theme';
import type { Difficulty } from '../game/types';
import { Icon } from './Icon';
import { StarRow } from './StarRow';

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  easy: '#1FD18B', medium: '#FFE14D', hard: '#FF8A1F', expert: '#E8384F',
};

interface Props {
  number: number;
  difficulty: Difficulty;
  stars: number;
  completed: boolean;
  locked: boolean;
  width: number;
  onPress(): void;
}

/** Level number, difficulty, stars and lock state; completed cards glow subtly (§10.1). */
export function LevelCard({ number, difficulty, stars, completed, locked, width, onPress }: Props) {
  const label = locked
    ? `Level ${number}, locked`
    : `Level ${number}, ${difficulty}, ${completed ? `${stars} of 3 stars` : 'not completed'}`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: locked }}
      style={({ pressed }) => [styles.card, { width, height: Math.max(width * 1.1, 72) }, completed && styles.done, locked && styles.locked, pressed && { opacity: 0.8 }]}
    >
      <Text maxFontSizeMultiplier={1.3} style={[styles.num, locked && { color: theme.textDim }]}>{number}</Text>
      {locked ? (
        <Icon name="lock" size={20} color={theme.textDim} />
      ) : (
        <>
          <StarRow count={stars} size={11} />
          <View style={[styles.dot, { backgroundColor: DIFFICULTY_COLOR[difficulty] }]} />
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, borderColor: theme.glassEdge, backgroundColor: theme.panel, alignItems: 'center', justifyContent: 'center', gap: 4 },
  done: { borderColor: theme.accent, shadowColor: theme.accent, shadowOpacity: 0.45, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  locked: { opacity: 0.55 },
  num: { color: theme.text, fontSize: 20, fontWeight: '800' },
  dot: { width: 14, height: 3, borderRadius: 2 },
});
