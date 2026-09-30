import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlowButton } from './src/components/GlowButton';
import { SettingsPanel } from './src/components/SettingsPanel';
import { theme } from './src/config/theme';
import { LEVELS } from './src/data/levels';
import { GameScreen } from './src/screens/GameScreen';
import { audio } from './src/services/audio';
import { useGameStore } from './src/store/gameStore';
import { useSettingsStore } from './src/store/settingsStore';

// Phase 2 shell: a plain level list and settings toggles around the real game screen.
// Navigation, persistence and the real menus arrive in Phase 3.
function Shell() {
  const insets = useSafeAreaInsets();
  const [levelId, setLevelId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const level = LEVELS.find((l) => l.id === levelId) ?? null;

  useEffect(() => {
    void audio.init();
    const set = useSettingsStore.getState().set;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => set({ systemReduceMotion: v }));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => set({ systemReduceMotion: v }));
    return () => sub.remove();
  }, []);

  const open = (id: string) => {
    useGameStore.getState().start(LEVELS.find((l) => l.id === id)!);
    setLevelId(id);
  };
  const exit = () => { useGameStore.getState().clear(); setLevelId(null); };
  const next = level && LEVELS[LEVELS.indexOf(level) + 1];

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {level ? (
        <GameScreen level={level} onExit={exit} onNext={next ? () => open(next.id) : undefined} />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingTop: insets.top + 24 }]}>
          <Text style={styles.logo} accessibilityRole="header">CHROMA LAB</Text>
          <GlowButton label={showSettings ? 'HIDE SETTINGS' : 'SETTINGS'} onPress={() => setShowSettings((v) => !v)} />
          {showSettings && <SettingsPanel />}
          {LEVELS.map((l) => (
            <Pressable key={l.id} style={styles.item} onPress={() => open(l.id)} accessibilityRole="button" accessibilityLabel={`Level ${l.number}, ${l.difficulty}`}>
              <Text style={styles.itemText}>LEVEL {l.number}</Text>
              <Text style={styles.itemSub}>{l.difficulty}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Shell />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
  logo: { color: theme.text, fontSize: 28, fontWeight: '800', letterSpacing: 4, textAlign: 'center', marginBottom: 8 },
  item: { minHeight: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, borderRadius: 12, backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.glassEdge },
  itemText: { color: theme.text, fontWeight: '600', letterSpacing: 1 },
  itemSub: { color: theme.textDim },
});
