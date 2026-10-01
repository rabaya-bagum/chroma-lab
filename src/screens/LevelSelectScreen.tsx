import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { LevelCard } from '../components/LevelCard';
import { StarRow } from '../components/StarRow';
import { theme } from '../config/theme';
import { CHAPTERS, isChapterAvailable } from '../data/chapters';
import { LEVELS } from '../data/levels';
import { isLevelUnlocked } from '../game/progress';
import { audio } from '../services/audio';
import { useProgressStore } from '../store/progressStore';
import { useToastStore } from '../store/toastStore';
import { maxColumns } from '../utils/layout';
import { goBack, playLevel } from '../utils/navigation';

const GAP = 10;
const PAD = 16;

export function LevelSelectScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const save = useProgressStore((s) => s.save);
  const cols = Math.min(maxColumns(width) - (width < 600 ? 1 : 0), 6);
  const cardW = (Math.min(width, 760) - PAD * 2 - GAP * (cols - 1)) / cols;

  const open = (n: number) => {
    const level = LEVELS[n - 1];
    if (!isLevelUnlocked(save, level)) {
      audio.play('invalid');
      useToastStore.getState().show({ kind: 'info', title: 'LOCKED', message: `Complete level ${n - 1} first.` });
      return;
    }
    audio.play('button');
    playLevel(level);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.top}>
        <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Icon name="back" size={24} />
        </Pressable>
        <Text maxFontSizeMultiplier={1.3} style={styles.title} accessibilityRole="header">LEVELS</Text>
        <View style={styles.stars} accessible accessibilityLabel={`${save.progress.starsTotal} stars collected`}>
          <StarRow count={1} size={14} />
          <Text style={styles.starCount}>{save.progress.starsTotal}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>
        {CHAPTERS.map((c) => {
          if (!isChapterAvailable(c)) {
            return (
              <View key={c.id} style={styles.soon} accessible accessibilityLabel={`Chapter ${c.id}, ${c.name}, coming soon`}>
                <Icon name="lock" size={22} color={theme.textDim} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.chTitle}>CHAPTER {c.id}  {c.name.toUpperCase()}</Text>
                  <Text style={styles.soonText}>Coming soon: {c.blurb.toLowerCase()}</Text>
                </View>
              </View>
            );
          }
          const levels = LEVELS.filter((l) => l.number >= c.firstLevel! && l.number <= c.lastLevel!);
          return (
            <View key={c.id} style={styles.chapter}>
              <Text maxFontSizeMultiplier={1.3} style={styles.chTitle} accessibilityRole="header">CHAPTER {c.id}  {c.name.toUpperCase()}</Text>
              <View style={styles.grid}>
                {levels.map((l) => {
                  const rec = save.progress.levels[l.id];
                  return (
                    <LevelCard
                      key={l.id}
                      number={l.number}
                      difficulty={l.difficulty}
                      stars={rec?.stars ?? 0}
                      completed={(rec?.completions ?? 0) > 0}
                      locked={!isLevelUnlocked(save, l)}
                      width={cardW}
                      onPress={() => open(l.number)}
                    />
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 8 },
  back: { width: 72, height: 48, justifyContent: 'center' },
  title: { color: theme.text, fontSize: 18, fontWeight: '800', letterSpacing: 4 },
  stars: { width: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  starCount: { color: theme.text, fontWeight: '700' },
  scroll: { paddingHorizontal: PAD, gap: 22, alignItems: 'center' },
  chapter: { width: '100%', maxWidth: 760, gap: 10 },
  chTitle: { color: theme.textDim, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  soon: { width: '100%', maxWidth: 760, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.glassEdge, opacity: 0.7 },
  soonText: { color: theme.textDim, marginTop: 2 },
});
