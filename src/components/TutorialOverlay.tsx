import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../config/theme';
import { TUTORIAL_TEXT } from '../game/tutorial';
import type { TutorialStep } from '../game/tutorial';

interface Props { step: TutorialStep; canSkip: boolean; onSkip(): void }

/** Instruction card for the level-1 tutorial (§8.5). */
export function TutorialOverlay({ step, canSkip, onSkip }: Props) {
  if (step > 3) return null;
  const text = TUTORIAL_TEXT[step as 0 | 1 | 2 | 3];
  return (
    <View style={styles.card} accessibilityLiveRegion="polite" accessible accessibilityLabel={`Tutorial step ${step + 1} of 4. ${text}`}>
      <Text maxFontSizeMultiplier={1.3} style={styles.step}>STEP {step + 1} OF 4</Text>
      <Text maxFontSizeMultiplier={1.3} style={styles.text}>{text}</Text>
      {canSkip && (
        <Pressable onPress={onSkip} accessibilityRole="button" accessibilityLabel="Skip tutorial" style={styles.skip}>
          <Text style={styles.skipText}>SKIP</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'center', alignItems: 'center', backgroundColor: 'rgba(18,27,51,0.96)', borderColor: theme.accent, borderWidth: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 18, marginHorizontal: 16, marginBottom: 6 },
  step: { color: theme.textDim, fontSize: 10, letterSpacing: 2 },
  text: { color: theme.text, fontSize: 17, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  skip: { minHeight: 48, minWidth: 64, alignItems: 'center', justifyContent: 'center' },
  skipText: { color: theme.accent, fontWeight: '700', letterSpacing: 1.5 },
});
