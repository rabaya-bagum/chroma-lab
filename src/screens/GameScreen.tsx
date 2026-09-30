import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLOR_NAMES, LIQUID_HEX, theme } from '../config/theme';
import { COLOR_LETTERS } from '../game/levelCodec';
import { selectDeadlocked, selectSolved, selectStars, useGameStore } from '../store/gameStore';
import type { Level, TubeState } from '../game/types';

// Phase 1: deliberately plain Views. Skia rendering arrives in Phase 2.
const UNIT = 34;

function describeTube(t: TubeState, index: number, total: number, selected: boolean): string {
  const layers = t.liquids.map((l) => l.color).join(', ');
  const free = t.capacity - t.liquids.length;
  const state = t.sealed ? ', complete' : t.locked ? ', locked' : '';
  return `Tube ${index + 1} of ${total}: ${layers ? `bottom to top ${layers}` : 'empty'}. ${free} free spaces${state}${selected ? ', selected' : ''}`;
}

const TubeView = React.memo(function TubeView(props: {
  tube: TubeState; index: number; total: number; selected: boolean; onPress(i: number): void;
}) {
  const { tube, index, total, selected, onPress } = props;
  return (
    <Pressable
      onPress={() => onPress(index)}
      accessibilityRole="button"
      accessibilityLabel={describeTube(tube, index, total, selected)}
      style={[styles.tubeHit, selected && styles.tubeLift]}
    >
      <View style={[styles.tube, selected && styles.tubeSelected, tube.sealed && styles.tubeSealed]}>
        {Array.from({ length: tube.capacity }, (_, slot) => {
          const layer = tube.liquids[tube.capacity - 1 - slot]; // render top slot first
          return (
            <View key={slot} style={[styles.unit, layer && { backgroundColor: LIQUID_HEX[layer.color] }]}>
              {layer && <Text style={styles.unitText}>{COLOR_LETTERS[layer.color]}</Text>}
            </View>
          );
        })}
      </View>
    </Pressable>
  );
});

function Button(props: { label: string; onPress(): void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityState={{ disabled: !!props.disabled }}
      disabled={props.disabled}
      onPress={props.onPress}
      style={[styles.button, props.disabled && styles.buttonOff]}
    >
      <Text style={styles.buttonText}>{props.label}</Text>
    </Pressable>
  );
}

export function GameScreen(props: { level: Level; onExit(): void; onNext?: () => void }) {
  const { level, onExit, onNext } = props;
  const session = useGameStore((s) => s.session);
  const selected = useGameStore((s) => s.selected);
  const solved = useGameStore(selectSolved);
  const deadlocked = useGameStore(selectDeadlocked);
  const stars = useGameStore(selectStars);
  const { tap, undo, restart, addTube } = useGameStore.getState();

  if (!session) return null;
  const { tubes, moves } = session.current;

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Button label="BACK" onPress={onExit} />
        <Text style={styles.title} accessibilityRole="header">LEVEL {level.number}</Text>
        <Text style={styles.moves}>Moves {moves}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.board}>
        {tubes.map((t, i) => (
          <TubeView key={t.id} tube={t} index={i} total={tubes.length} selected={selected === i} onPress={tap} />
        ))}
      </ScrollView>

      {deadlocked && !solved && (
        <Text style={styles.banner}>No moves left. Undo, Restart or add a tube.</Text>
      )}
      {solved && stars !== null && (
        <View style={styles.win}>
          <Text style={styles.winTitle}>EXPERIMENT COMPLETE</Text>
          <Text style={styles.winText}>{stars} of 3 stars, {moves} moves (best possible {level.optimalMoves})</Text>
          <View style={styles.row}>
            {onNext && <Button label="NEXT" onPress={onNext} />}
            <Button label="REPLAY" onPress={restart} />
            <Button label="LEVELS" onPress={onExit} />
          </View>
        </View>
      )}

      <View style={styles.row}>
        <Button label="UNDO" onPress={undo} disabled={session.history.length === 0 || solved} />
        <Button label="RESTART" onPress={restart} />
        <Button label="+ TUBE" onPress={addTube} disabled={session.extraTubeUsed || solved} />
      </View>
      <Text style={styles.legend} accessibilityElementsHidden importantForAccessibility="no">
        {Object.entries(COLOR_LETTERS).map(([c, l]) => `${l} ${COLOR_NAMES[c as keyof typeof COLOR_NAMES]}`).join('   ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, paddingTop: 48, paddingHorizontal: 16, paddingBottom: 24 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { color: theme.text, fontSize: 20, fontWeight: '700', letterSpacing: 2 },
  moves: { color: theme.textDim, fontSize: 16, minWidth: 80, textAlign: 'right' },
  board: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingVertical: 24, gap: 4 },
  tubeHit: { minWidth: 56, minHeight: 48, padding: 8, alignItems: 'center' },
  tubeLift: { transform: [{ translateY: -12 }] },
  tube: { width: UNIT + 6, padding: 2, borderWidth: 2, borderColor: theme.glassEdge, borderRadius: 10, backgroundColor: theme.glass },
  tubeSelected: { borderColor: theme.accent },
  tubeSealed: { borderColor: theme.textDim, opacity: 0.85 },
  unit: { width: UNIT, height: UNIT, marginVertical: 1, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  unitText: { color: '#0A1020', fontWeight: '700', fontSize: 13 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 8 },
  button: { minWidth: 88, minHeight: 48, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.glassEdge, backgroundColor: theme.panel, alignItems: 'center', justifyContent: 'center' },
  buttonOff: { opacity: 0.4 },
  buttonText: { color: theme.text, fontWeight: '600', letterSpacing: 1 },
  banner: { color: theme.warn, textAlign: 'center', marginVertical: 8 },
  win: { backgroundColor: theme.panel, borderRadius: 16, padding: 16, marginVertical: 8, alignItems: 'center' },
  winTitle: { color: theme.accent, fontSize: 18, fontWeight: '700', letterSpacing: 2 },
  winText: { color: theme.text, marginVertical: 8 },
  legend: { color: theme.textDim, fontSize: 11, textAlign: 'center' },
});
