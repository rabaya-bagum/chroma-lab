import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CoinDisplay } from '../components/CoinDisplay';
import { GlowButton } from '../components/GlowButton';
import { Icon } from '../components/Icon';
import { Logo } from '../components/Logo';
import { theme } from '../config/theme';
import { features } from '../config/features';
import { labLevelFor } from '../config/economy';
import { LEVELS } from '../data/levels';
import { continueTarget } from '../game/progress';
import type { Session } from '../game/types';
import { LabBackground } from '../render/LabBackground';
import { audio } from '../services/audio';
import { loadSavedSession } from '../services/persistence';
import { useProgressStore } from '../store/progressStore';
import { playLevel, resumeSession } from '../utils/navigation';

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const save = useProgressStore((s) => s.save);
  const [saved, setSaved] = useState<Session | null>(null);

  // re-check for an in-progress level whenever Home regains focus
  useFocusEffect(useCallback(() => {
    let alive = true;
    void loadSavedSession().then((s) => { if (alive) setSaved(s); });
    return () => { alive = false; };
  }, []));

  const target = continueTarget(save, LEVELS, !!saved);
  const lab = labLevelFor(save.progress.researchXp);

  const onPrimary = () => {
    audio.play('button');
    if (target.kind === 'resume' && saved) resumeSession(saved);
    else if (target.level) playLevel(target.level);
  };

  return (
    <View style={styles.root}>
      <LabBackground />
      <View style={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.header}>
          <View accessible accessibilityLabel={`Lab level ${lab.level}`}>
            <Text style={styles.chipLabel}>LAB LEVEL</Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.chipValue}>{lab.level}</Text>
          </View>
          <CoinDisplay coins={save.economy.coins} />
          <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Settings" style={styles.gear}>
            <Icon name="gear" size={26} />
          </Pressable>
        </View>

        <View style={styles.logo}><Logo /></View>

        <View style={styles.buttons}>
          <View style={styles.primary}>
            <GlowButton primary label={target.label} onPress={onPrimary} accessibilityLabel={target.kind === 'resume' ? 'Continue your level' : target.label === 'PLAY' ? 'Play' : 'Continue to next level'} />
          </View>
          <GlowButton label="LEVELS" onPress={() => { audio.play('button'); router.push('/levels'); }} />
          {features.daily && <GlowButton label="DAILY EXPERIMENT" onPress={() => undefined} />}
          {features.laboratory && <GlowButton label="LABORATORY" onPress={() => undefined} />}
          {features.collection && <GlowButton label="COLLECTION" onPress={() => undefined} />}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chipLabel: { color: theme.textDim, fontSize: 10, letterSpacing: 2 },
  chipValue: { color: theme.text, fontSize: 22, fontWeight: '800' },
  gear: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  logo: { alignItems: 'center', marginTop: 28 },
  buttons: { marginTop: 48, alignItems: 'center', gap: 12 },
  primary: { transform: [{ scale: 1.25 }], marginBottom: 14 },
});
