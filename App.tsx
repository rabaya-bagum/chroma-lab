import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from './src/config/theme';
import { LEVELS } from './src/data/levels';
import { GameScreen } from './src/screens/GameScreen';
import { useGameStore } from './src/store/gameStore';

// Phase 1 shell: a plain level list and the bare game screen.
// Navigation, persistence and the real menus arrive in Phase 3.
export default function App() {
  const [levelId, setLevelId] = useState<string | null>(null);
  const level = LEVELS.find((l) => l.id === levelId) ?? null;

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
        <ScrollView contentContainerStyle={styles.list}>
          <Text style={styles.logo} accessibilityRole="header">CHROMA LAB</Text>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  list: { paddingTop: 64, paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
  logo: { color: theme.text, fontSize: 28, fontWeight: '800', letterSpacing: 4, textAlign: 'center', marginBottom: 16 },
  item: { minHeight: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, borderRadius: 12, backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.glassEdge },
  itemText: { color: theme.text, fontWeight: '600', letterSpacing: 1 },
  itemSub: { color: theme.textDim },
});
