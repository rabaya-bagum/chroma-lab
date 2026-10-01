import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../config/theme';
import { extraTubeCost } from '../config/economy';
import { GameBoard } from '../components/GameBoard';
import { GameControls } from '../components/GameControls';
import { TopBar } from '../components/TopBar';
import { TutorialOverlay } from '../components/TutorialOverlay';
import { WinOverlay } from '../components/WinOverlay';
import { isPuzzleSolved } from '../game/rules';
import { calculateStars } from '../game/scoring';
import { advanceTutorial, tutorialAllowsTap, tutorialHighlight } from '../game/tutorial';
import type { TutorialStep } from '../game/tutorial';
import type { Level } from '../game/types';
import { audio } from '../services/audio';
import { haptics } from '../services/haptics';
import { persistence } from '../services/persistence';
import { selectDeadlocked, useGameStore } from '../store/gameStore';
import { useProgressStore } from '../store/progressStore';
import { useToastStore } from '../store/toastStore';

const WIN_SEQUENCE_MS = 2200;

interface Props {
  level: Level;
  /** Run the tutorial even if it was completed before (Settings > Replay tutorial). */
  forceTutorial?: boolean;
  onExit(): void;
  onNext?: () => void;
}

export function GameScreen({ level, forceTutorial, onExit, onNext }: Props) {
  const insets = useSafeAreaInsets();
  const session = useGameStore((s) => s.session);
  const selected = useGameStore((s) => s.selected);
  const lastEvents = useGameStore((s) => s.lastEvents);
  const shake = useGameStore((s) => s.shake);
  const deadlocked = useGameStore(selectDeadlocked);
  const coins = useProgressStore((s) => s.save.economy.coins);

  const [busy, setBusy] = useState(false);
  const [winPlaying, setWinPlaying] = useState(false);
  const result = useProgressStore((p) => p.lastCompletion);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const winTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recorded = useRef(false);

  const [tutorialDoneAtStart] = useState(() => useProgressStore.getState().save.progress.tutorialDone);
  const tutorialEligible = level.tutorial === 'basics' && (!!forceTutorial || !tutorialDoneAtStart);
  // a resumed, half-played board skips the tutorial rather than restarting it
  const [tutStep, setTutStep] = useState<TutorialStep>(() =>
    tutorialEligible && (useGameStore.getState().session?.current.moves ?? 0) === 0 ? 0 : 4);
  const tutorialActive = tutStep < 4;

  const solved = !!session && isPuzzleSolved(session.current);

  // play time while the app is in the foreground
  useEffect(() => {
    const id = setInterval(() => { if (AppState.currentState === 'active') useGameStore.getState().tick(1000); }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => { if (winTimer.current) clearTimeout(winTimer.current); audio.duckMusic(false); }, []);

  // record the completion as soon as the puzzle is solved, so closing the app mid-celebration still saves it
  useEffect(() => {
    if (!solved) { recorded.current = false; useProgressStore.getState().clearCompletion(); return; }
    if (recorded.current || !session) return;
    recorded.current = true;
    useProgressStore.getState().recordCompletion(level, session);
    void persistence.clearSession();
  }, [solved, session, level]);

  const onTap = useCallback((tube: number) => {
    const store = useGameStore.getState();
    if (tutorialActive && !tutorialAllowsTap(tutStep, tube)) return;
    const before = store.session?.current;
    const action = store.tap(tube);
    if (!action) return;
    if (tutorialActive && before) setTutStep(advanceTutorial(tutStep, action, before));
    switch (action.type) {
      case 'select':
      case 'moveSelection': haptics.trigger('select'); audio.play('glassTap'); break;
      case 'deselect': audio.play('glassTap'); break;
      case 'shake': audio.play('invalid'); if (action.warn) haptics.trigger('invalid'); break;
      case 'pour': break; // pour sound and haptic start with the animation
    }
  }, [tutorialActive, tutStep]);

  const finishWin = useCallback(() => {
    if (winTimer.current) clearTimeout(winTimer.current);
    winTimer.current = null;
    setWinPlaying(false);
    setOverlayVisible(true);
    audio.duckMusic(false);
  }, []);

  // achievement toasts once the overlay is up
  useEffect(() => {
    if (!overlayVisible || !result) return;
    result.achievements.forEach((a, i) => {
      setTimeout(() => {
        useToastStore.getState().show({ kind: 'achievement', title: a.name.toUpperCase(), message: `Achievement unlocked. +${a.reward} coins` });
        audio.play('unlock');
      }, 600 + i * 700);
    });
    if (result.coinsEarned > 0) audio.play('coin');
  }, [overlayVisible, result]);

  const onSolved = useCallback(() => {
    audio.play('win');
    audio.duckMusic(true);
    haptics.trigger('levelComplete');
    setWinPlaying(true);
    winTimer.current = setTimeout(finishWin, WIN_SEQUENCE_MS);
  }, [finishWin]);

  const restart = useCallback(() => {
    const go = () => { audio.play('button'); setOverlayVisible(false); setWinPlaying(false); useGameStore.getState().restart(); if (tutorialEligible) setTutStep(0); };
    const moves = useGameStore.getState().session?.current.moves ?? 0;
    if (moves >= 5) {
      Alert.alert('Restart level?', 'Your progress on this level will be lost.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restart', style: 'destructive', onPress: go },
      ]);
    } else go();
  }, [tutorialEligible]);

  const addTube = useCallback(() => {
    const cost = extraTubeCost(level.number);
    if (cost > 0 && !useProgressStore.getState().spend(cost)) {
      useToastStore.getState().show({ kind: 'warn', title: 'NOT ENOUGH COINS', message: `An extra tube costs ${cost} coins.` });
      return;
    }
    audio.play('button');
    useGameStore.getState().addTube();
  }, [level.number]);

  if (!session) return null;
  const { moves } = session.current;
  const stars = calculateStars(moves, level, session);
  const cost = extraTubeCost(level.number);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
      <TopBar levelNumber={level.number} moves={moves} stars={stars} coins={coins} onBack={onExit} />

      {tutorialActive && <TutorialOverlay step={tutStep} canSkip={tutorialDoneAtStart} onSkip={() => setTutStep(4)} />}

      <View style={styles.board}>
        <GameBoard
          current={session.current}
          events={lastEvents}
          selected={selected}
          shake={shake}
          onTap={onTap}
          onBackgroundTap={() => { const s = useGameStore.getState().selected; if (s !== null) onTap(s); }}
          highlight={tutorialActive ? tutorialHighlight(tutStep) : undefined}
          onPourStart={() => { haptics.trigger('pour'); audio.play('pour'); }}
          onTubeComplete={() => { audio.play('tubeComplete'); haptics.trigger('tubeComplete'); }}
          onSolved={onSolved}
          onBusyChange={setBusy}
        />
        {winPlaying && (
          <Pressable style={StyleSheet.absoluteFill} onPress={finishWin} accessibilityLabel="Skip celebration" accessibilityRole="button" />
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
        tubeCost={cost}
        coins={coins}
        disabled={busy || solved || tutorialActive}
        onUndo={() => { audio.play('button'); useGameStore.getState().undo(); }}
        onRestart={restart}
        onAddTube={addTube}
      />

      {overlayVisible && result && solved && (
        <WinOverlay
          result={result}
          hasNext={!!onNext}
          onNext={() => onNext?.()}
          onReplay={() => { setOverlayVisible(false); setWinPlaying(false); useGameStore.getState().restart(); }}
          onLevels={onExit}
        />
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  board: { flex: 1, marginHorizontal: 8 },
  banner: { backgroundColor: 'rgba(255,138,31,0.15)', borderColor: theme.warn, borderWidth: 1, borderRadius: 12, marginHorizontal: 16, padding: 10 },
  bannerText: { color: theme.warn, textAlign: 'center' },
});
