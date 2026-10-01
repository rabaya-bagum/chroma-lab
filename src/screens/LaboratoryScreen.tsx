import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { StarRow } from '../components/StarRow';
import { theme } from '../config/theme';
import { labLevelFor } from '../config/economy';
import { LAB_EQUIPMENT } from '../data/labEquipment';
import { LabScene } from '../render/LabScene';
import { useProgressStore } from '../store/progressStore';

export function LaboratoryScreen() {
  const insets = useSafeAreaInsets();
  const stars = useProgressStore((s) => s.save.progress.starsTotal);
  const xp = useProgressStore((s) => s.save.progress.researchXp);
  const lab = labLevelFor(xp);
  const next = LAB_EQUIPMENT.find((e) => stars < e.stars && e.mvp);
  const pct = Math.min(1, lab.xpIntoLevel / lab.xpForNext);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Icon name="back" size={24} />
        </Pressable>
        <Text maxFontSizeMultiplier={1.3} style={styles.title} accessibilityRole="header">LABORATORY</Text>
        <View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View style={styles.stats}>
          <View accessible accessibilityLabel={`Lab level ${lab.level}`}>
            <Text style={styles.label}>LAB LEVEL</Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.big}>{lab.level}</Text>
          </View>
          <View style={styles.xp} accessible accessibilityLabel={`${lab.xpIntoLevel} of ${lab.xpForNext} research XP to the next level`}>
            <Text style={styles.label}>RESEARCH XP  {lab.xpIntoLevel} / {lab.xpForNext}</Text>
            <View style={styles.bar}><View style={[styles.fill, { width: `${Math.round(pct * 100)}%` }]} /></View>
          </View>
          <View style={styles.starBox} accessible accessibilityLabel={`${stars} stars`}>
            <StarRow count={1} size={14} />
            <Text style={styles.starCount}>{stars}</Text>
          </View>
        </View>
        {next && <Text style={styles.next}>{next.stars - stars} more stars to unlock the {next.name}.</Text>}
        <LabScene starsTotal={stars} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 8 },
  back: { width: 72, height: 48, justifyContent: 'center' },
  title: { color: theme.text, fontSize: 18, fontWeight: '800', letterSpacing: 4 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingVertical: 8 },
  label: { color: theme.textDim, fontSize: 10, letterSpacing: 2 },
  big: { color: theme.text, fontSize: 28, fontWeight: '800' },
  xp: { flex: 1, gap: 6 },
  bar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(150,190,255,0.15)', overflow: 'hidden' },
  fill: { height: 8, backgroundColor: theme.accent },
  starBox: { alignItems: 'center', gap: 2 },
  starCount: { color: theme.text, fontWeight: '700' },
  next: { color: theme.textDim, paddingHorizontal: 16, paddingBottom: 8 },
});
