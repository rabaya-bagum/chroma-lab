import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../config/theme';
import { GameBoard } from '../components/GameBoard';
import { GameControls } from '../components/GameControls';
import { GlowButton } from '../components/GlowButton';
import { StarRow } from '../components/StarRow';
import { TopBar } from '../components/TopBar';
import { isPuzzleSolved } from '../game/rules';
import { calculateStars } from '../game/scoring';
import { audio } from '../services/audio';
import { haptics } from '../services/haptics';
import { selectDeadlocked, useGameStore } from '../store/gameStore';
import type { Level } from '../game/types';

const WIN_SEQUENCE_MS = 2200;

export function GameScreen({ level, onExit, onNext }: { level: Level; onExit(): void; onNext?: () => void }) {
  const insets = useSafeAreaInsets();
  const session = useGameStore((s) => s.session);
  const selected = useGameStore((s) => s.selected);
  const lastEvents = useGameStore((s) => s.lastEvents);
  const shake = useGameStore((s) => s.shake);
  const deadlocked = useGameStore(selectDeadlocked);
  const [busy, setBusy] = useState(false);
  const [winVisible, setWinVisible] = useState(false);
  const [winPlaying, setWinPlaying] = useState(false);
  const winTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const solved = !!session && isPuzzleSolved(session.current);
  useEffect(() => { if (!solved) { setWinVisible(false); setWinPlaying(false); } }, [solved]);
  useEffect(() => () => { if (winTimer.current) clearTimeout(winTimer.current); audio.duckMusic(false); }, []);

  const onTap = useCallback((tube: number) => {
    const action = useGameStore.getState().tap(tube);
    if (!action) return;
    switch (action.type) {
      case 'select':
      case 'moveSelection': haptics.trigger('select'); audio.play('glassTap'); break;
      case 'deselect': audio.play('glassTap'); break;
      case 'shake': audio.play('invalid'); if (action.warn) haptics.trigger('invalid'); break;
      case 'pour': break; // pour sound and haptic start with the animation
    }
  }, []);

  const finishWin = useCallback(() => {
    if (winTimer.current) clearTimeout(winTimer.current);
    winTimer.current = null;
    setWinPlaying(false);
    setWinVisible(true);
    audio.duckMusic(false);
  }, []);

  const onSolved = useCallback(() => {
    audio.play('win');
    audio.duckMusic(true);
    haptics.trigger('levelComplete');
    setWinPlaying(true);
    winTimer.current = setTimeout(finishWin, WIN_SEQUENCE_MS);
  }, [finishWin]);

  const restart = useCallback(() => {
    const go = () => { audio.play('button'); useGameStore.getState().restart(); };
    const moves = useGameStore.getState().session?.current.moves ?? 0;
    if (moves >= 5) {
      Alert.alert('Restart level?', 'Your progress on this level will be lost.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restart', style: 'destructive', onPress: go },
      ]);
    } else go();
  }, []);

  if (!session) return null;
  const { moves } = session.current;
  const stars = calculateStars(moves, level, session);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
      <TopBar levelNumber={level.number} moves={moves} stars={stars} onBack={onExit} />

      <View style={styles.board}>
        <GameBoard
          current={session.current}
          events={lastEvents}
          selected={selected}
          shake={shake}
          onTap={onTap}
          onBackgroundTap={() => useGameStore.getState().selected !== null && onTap(useGameStore.getState().selected!)}
          onPourStart={() => { haptics.trigger('pour'); audio.play('pour'); }}
          onTubeComplete={() => { audio.play('tubeComplete'); haptics.trigger('tubeComplete'); }}
          onSolved={onSolved}
          onBusyChange={setBusy}
        />
        {winPlaying && (
          <Pressable style={StyleSheet.absoluteFill} onPress={finishWin} accessibilityLabel="Skip celebration" accessibilityRole="button" />
        )}
        {winVisible && (
          <View style={[styles.win, styles.winOverlay]} accessibilityLiveRegion="polite">
            <Text maxFontSizeMultiplier={1.3} style={styles.winTitle} accessibilityRole="header">EXPERIMENT COMPLETE</Text>
            <StarRow count={stars} size={28} />
            <Text maxFontSizeMultiplier={1.3} style={styles.winText}>{moves} moves. Best possible: {level.optimalMoves}.</Text>
            <View style={styles.row}>
              {onNext && <GlowButton primary label="NEXT" onPress={onNext} accessibilityLabel="Next experiment" />}
              <GlowButton label="REPLAY" onPress={() => useGameStore.getState().restart()} />
              <GlowButton label="LEVELS" onPress={onExit} />
            </View>
          </View>
        )}
      </View>

      {deadlocked && !solved && !busy && (
        <View style={styles.banner} accessibilityLiveRegion="polite">
          <Text maxFontSizeMultiplier={1.3} style={styles.bannerText}>This mixture is stuck. Undo, Restart or add a tube.</Text>
        </View>
      )}

      <GameControls
        canUndo={session.history.length > 0}
        canAddTube={!session.extraTubeUsed}
        disabled={busy || solved}
        onUndo={() => { audio.play('button'); useGameStore.getState().undo(); }}
        onRestart={restart}
        onAddTube={() => { audio.play('button'); useGameStore.getState().addTube(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  board: { flex: 1, marginHorizontal: 8 },
  banner: { backgroundColor: 'rgba(255,138,31,0.15)', borderColor: theme.warn, borderWidth: 1, borderRadius: 12, marginHorizontal: 16, padding: 10 },
  bannerText: { color: theme.warn, textAlign: 'center' },
  win: { alignItems: 'center', gap: 10, backgroundColor: 'rgba(18,27,51,0.96)', borderColor: theme.accent, borderWidth: 1, borderRadius: 18, margin: 12, padding: 16 },
  winTitle: { color: theme.accent, fontSize: 18, fontWeight: '800', letterSpacing: 3 },
  winText: { color: theme.text },
  winOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, margin: 0 },
  row: { flexDirection: 'row', gap: 10 },
});
