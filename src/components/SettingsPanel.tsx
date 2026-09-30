import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { theme } from '../config/theme';
import { audio } from '../services/audio';
import { useSettingsStore } from '../store/settingsStore';
import type { ReduceMotionSetting, Settings } from '../store/settingsStore';

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
const MOTION: ReduceMotionSetting[] = ['system', 'on', 'off'];

/** Temporary settings list for Phase 2; the full Settings screen arrives in Phase 3. */
export function SettingsPanel() {
  const s = useSettingsStore();
  const set = (patch: Partial<Settings>) => { s.set(patch); if ('music' in patch) setTimeout(() => audio.syncMusic(), 0); };
  return (
    <View style={styles.box}>
      {ROWS.map((r) => (
        <View key={r.key} style={styles.row}>
          <Text style={styles.label}>{r.label}</Text>
          <Switch value={s[r.key]} onValueChange={(v) => set({ [r.key]: v })} accessibilityLabel={r.label} />
        </View>
      ))}
      <View style={styles.row}>
        <Text style={styles.label}>Reduce Motion</Text>
        <View style={styles.seg}>
          {MOTION.map((m) => (
            <Pressable key={m} onPress={() => set({ reduceMotion: m })} accessibilityRole="button" accessibilityLabel={`Reduce motion ${m}`}
              accessibilityState={{ selected: s.reduceMotion === m }} style={[styles.segBtn, s.reduceMotion === m && styles.segOn]}>
              <Text style={styles.segText}>{m.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: theme.panel, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: theme.glassEdge },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: theme.text, fontSize: 15 },
  seg: { flexDirection: 'row', gap: 6 },
  segBtn: { minHeight: 40, minWidth: 48, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, borderColor: theme.glassEdge, alignItems: 'center', justifyContent: 'center' },
  segOn: { borderColor: theme.accent, backgroundColor: 'rgba(39,227,242,0.15)' },
  segText: { color: theme.text, fontSize: 11, fontWeight: '700' },
});
