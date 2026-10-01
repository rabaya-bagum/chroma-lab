import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlowButton } from '../components/GlowButton';
import { Icon } from '../components/Icon';
import { theme } from '../config/theme';
import { ACHIEVEMENT_LIST } from '../data/achievements';
import { LEVELS } from '../data/levels';
import { audio } from '../services/audio';
import { persistence } from '../services/persistence';
import { useProgressStore } from '../store/progressStore';
import { useSettingsStore } from '../store/settingsStore';
import type { ReduceMotionSetting, Settings } from '../store/settingsStore';
import { goBack, playLevel } from '../utils/navigation';

type BoolKey = 'music' | 'sound' | 'haptics' | 'colorBlind' | 'patterns' | 'labels' | 'highContrast';
const ROWS: { key: BoolKey; label: string }[] = [
  { key: 'music', label: 'Music' },
  { key: 'sound', label: 'Sound' },
  { key: 'haptics', label: 'Haptics' },
  { key: 'colorBlind', label: 'Colour-blind mode' },
  { key: 'patterns', label: 'Pattern overlays' },
  { key: 'labels', label: 'Colour labels' },
  { key: 'highContrast', label: 'High contrast' },
];
const MOTION: { value: ReduceMotionSetting; label: string }[] = [
  { value: 'system', label: 'SYSTEM' }, { value: 'on', label: 'ON' }, { value: 'off', label: 'OFF' },
];

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const s = useSettingsStore();
  const achievements = useProgressStore((p) => p.save.progress.achievements);

  const set = (patch: Partial<Settings>) => {
    useSettingsStore.getState().set(patch);
    if ('music' in patch) setTimeout(() => audio.syncMusic(), 0);
  };

  const replayTutorial = () => {
    const level = LEVELS.find((l) => l.tutorial === 'basics');
    if (level) playLevel(level, { tutorial: true });
  };

  const resetProgress = () => {
    Alert.alert('Reset progress?', 'This erases your levels, stars, coins and achievements.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue', style: 'destructive',
        onPress: () => Alert.alert('Are you absolutely sure?', 'This cannot be undone.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Erase everything', style: 'destructive', onPress: () => { useProgressStore.getState().resetProgress(); void persistence.clearSession(); } },
        ]),
      },
    ]);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.top}>
        <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Icon name="back" size={24} />
        </Pressable>
        <Text maxFontSizeMultiplier={1.3} style={styles.title} accessibilityRole="header">SETTINGS</Text>
        <View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.box}>
          {ROWS.map((r) => (
            <View key={r.key} style={styles.row}>
              <Text maxFontSizeMultiplier={1.3} style={styles.label}>{r.label}</Text>
              <Switch value={s[r.key]} onValueChange={(v) => set({ [r.key]: v })} accessibilityLabel={r.label} />
            </View>
          ))}
          <View style={styles.row}>
            <Text maxFontSizeMultiplier={1.3} style={styles.label}>Reduce Motion</Text>
            <View style={styles.seg}>
              {MOTION.map((m) => (
                <Pressable key={m.value} onPress={() => set({ reduceMotion: m.value })} accessibilityRole="button"
                  accessibilityLabel={`Reduce motion ${m.label.toLowerCase()}`} accessibilityState={{ selected: s.reduceMotion === m.value }}
                  style={[styles.segBtn, s.reduceMotion === m.value && styles.segOn]}>
                  <Text style={styles.segText}>{m.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <GlowButton label="REPLAY TUTORIAL" onPress={replayTutorial} />
          <GlowButton label="RESET PROGRESS" onPress={resetProgress} />
        </View>

        <Text style={styles.section} accessibilityRole="header">ACHIEVEMENTS</Text>
        <View style={styles.box}>
          {ACHIEVEMENT_LIST.map((a) => {
            const got = !!achievements[a.id];
            return (
              <View key={a.id} style={[styles.ach, !got && { opacity: 0.5 }]} accessible accessibilityLabel={`${a.name}. ${a.description}. ${got ? 'Unlocked' : 'Locked'}. Reward ${a.reward} coins`}>
                <Icon name={got ? 'hint' : 'lock'} size={20} color={got ? '#FFD84D' : theme.textDim} />
                <View style={{ flex: 1 }}>
                  <Text maxFontSizeMultiplier={1.3} style={styles.achName}>{a.name}</Text>
                  <Text maxFontSizeMultiplier={1.3} style={styles.achDesc}>{a.description}</Text>
                </View>
                <Text style={styles.reward}>+{a.reward}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 8 },
  back: { width: 72, height: 48, justifyContent: 'center' },
  title: { color: theme.text, fontSize: 18, fontWeight: '800', letterSpacing: 4 },
  scroll: { paddingHorizontal: 16, gap: 16, alignItems: 'center' },
  box: { width: '100%', maxWidth: 560, backgroundColor: theme.panel, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: theme.glassEdge },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: theme.text, fontSize: 15 },
  seg: { flexDirection: 'row', gap: 6 },
  segBtn: { minHeight: 44, minWidth: 56, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, borderColor: theme.glassEdge, alignItems: 'center', justifyContent: 'center' },
  segOn: { borderColor: theme.accent, backgroundColor: 'rgba(39,227,242,0.15)' },
  segText: { color: theme.text, fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12 },
  section: { color: theme.textDim, fontSize: 12, fontWeight: '700', letterSpacing: 2, alignSelf: 'flex-start', maxWidth: 560 },
  ach: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  achName: { color: theme.text, fontWeight: '700' },
  achDesc: { color: theme.textDim, fontSize: 12 },
  reward: { color: '#FFC83D', fontWeight: '700' },
});
