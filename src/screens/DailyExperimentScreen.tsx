import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlowButton } from '../components/GlowButton';
import { Icon } from '../components/Icon';
import { theme } from '../config/theme';
import { currentStreak, hasCompletedDaily } from '../game/daily';
import { audio } from '../services/audio';
import { useDailyStore } from '../store/dailyStore';
import { useProgressStore } from '../store/progressStore';
import { addDays, localDateKey } from '../utils/date';
import { playLevel } from '../utils/navigation';

const fmtTime = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
const prettyDate = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
};

/** Animated "Synthesising" text shown while today's puzzle is generated on the device. */
function Synthesising() {
  const [dots, setDots] = useState(1);
  useEffect(() => { const id = setInterval(() => setDots((d) => (d % 3) + 1), 450); return () => clearInterval(id); }, []);
  return (
    <View accessible accessibilityLabel="Synthesising today's experiment" accessibilityLiveRegion="polite" style={styles.synth}>
      <Text maxFontSizeMultiplier={1.3} style={styles.synthText}>SYNTHESISING{'.'.repeat(dots)}</Text>
    </View>
  );
}

export function DailyExperimentScreen() {
  const insets = useSafeAreaInsets();
  const save = useProgressStore((s) => s.save);
  const level = useDailyStore((s) => s.level);
  const status = useDailyStore((s) => s.status);
  const [todayKey, setTodayKey] = useState(localDateKey());

  // re-check the date every time the screen is shown (a new day is a new puzzle)
  useFocusEffect(useCallback(() => {
    const key = localDateKey();
    setTodayKey(key);
    void useDailyStore.getState().ensure(key);
  }, []));

  const done = hasCompletedDaily(save, todayKey);
  const best = save.daily.history[todayKey];
  const streak = currentStreak(save, todayKey);
  const ready = status === 'ready' && !!level && level.id === `daily-${todayKey}`;
  const colours = level ? new Set(level.tubes.flatMap((t) => t.liquids.map((l) => l.color))).size : 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Icon name="back" size={24} />
        </Pressable>
        <Text maxFontSizeMultiplier={1.3} style={styles.title} accessibilityRole="header">DAILY EXPERIMENT</Text>
        <View style={styles.back} />
      </View>

      <View style={styles.card}>
        <Text style={styles.date}>{prettyDate(todayKey)}</Text>
        {!ready ? (
          <Synthesising />
        ) : (
          <>
            <View style={styles.row} accessible accessibilityLabel={`${level!.difficulty} difficulty, ${colours} colours`}>
              <Text style={styles.label}>DIFFICULTY</Text>
              <Text style={styles.value}>{level!.difficulty.toUpperCase()}  {colours} COLOURS</Text>
            </View>
            <View style={styles.row} accessible accessibilityLabel={`Current streak ${streak} days`}>
              <Text style={styles.label}>STREAK</Text>
              <Text style={styles.value}>{streak} {streak === 1 ? 'DAY' : 'DAYS'}</Text>
            </View>
            <View style={styles.row} accessible accessibilityLabel={done ? `Completed. Best ${best.moves} moves in ${fmtTime(best.timeMs)}` : 'Not completed yet'}>
              <Text style={styles.label}>TODAY</Text>
              <Text style={[styles.value, done && { color: theme.accent }]}>
                {done ? `COMPLETE  ${best.moves} MOVES  ${fmtTime(best.timeMs)}` : 'NOT COMPLETED'}
              </Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.actions}>
        <GlowButton
          primary
          label={done ? 'PLAY AGAIN' : 'PLAY'}
          disabled={!ready}
          onPress={() => { if (level) { audio.play('button'); playLevel(level); } }}
          accessibilityLabel={done ? 'Play today’s experiment again' : 'Play today’s experiment'}
        />
        <Text style={styles.note}>
          {done ? `Replays do not change your streak. Next experiment: ${prettyDate(addDays(todayKey, 1))}.` : 'Finish today to keep your streak going.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 8 },
  back: { width: 72, height: 48, justifyContent: 'center' },
  title: { color: theme.text, fontSize: 16, fontWeight: '800', letterSpacing: 3 },
  card: { margin: 16, padding: 18, gap: 14, borderRadius: 18, borderWidth: 1, borderColor: theme.glassEdge, backgroundColor: theme.panel },
  date: { color: theme.text, fontSize: 20, fontWeight: '700' },
  row: { gap: 2 },
  label: { color: theme.textDim, fontSize: 10, letterSpacing: 2 },
  value: { color: theme.text, fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  synth: { minHeight: 120, alignItems: 'center', justifyContent: 'center' },
  synthText: { color: theme.accent, fontSize: 16, fontWeight: '800', letterSpacing: 4 },
  actions: { alignItems: 'center', gap: 16, marginTop: 8, paddingHorizontal: 24 },
  note: { color: theme.textDim, textAlign: 'center' },
});
