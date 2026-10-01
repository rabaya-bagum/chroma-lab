import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLOR_NAMES } from '../config/theme';
import { extraTubeCost, hintCost } from '../config/economy';
import { GameBoard } from '../components/GameBoard';
import { GameControls } from '../components/GameControls';
import { MechanicsNote } from '../components/MechanicsNote';
import { RecipeLegend } from '../components/RecipeLegend';
import { ReactorMeter } from '../components/ReactorMeter';
import { TopBar } from '../components/TopBar';
import { TutorialOverlay } from '../components/TutorialOverlay';
import { DailyWinOverlay, WinOverlay } from '../components/WinOverlay';
import { COSMETIC_BY_ID } from '../data/cosmetics';
import { LAB_EQUIPMENT } from '../data/labEquipment';
import { findHint } from '../game/hints';
import { isMixPour } from '../game/mixing';
import { isPuzzleSolved } from '../game/rules';
import { calculateStars } from '../game/scoring';
import { advanceMixTutorial, advanceTutorial, tutorialAllowsTap, tutorialHighlight } from '../game/tutorial';
import type { MixTutorialStep, TutorialStep } from '../game/tutorial';
import type { Level } from '../game/types';
import { useCosmetics } from '../render/useCosmetics';
import { analytics } from '../services/analytics';
import { audio } from '../services/audio';
import { haptics } from '../services/haptics';
import { leaderboard } from '../services/leaderboard';
import { persistence } from '../services/persistence';
import { selectDeadlocked, useGameStore } from '../store/gameStore';
import { useProgressStore } from '../store/progressStore';
import { useToastStore } from '../store/toastStore';

const WIN_SEQUENCE_MS = 2200;
const HINT_RING_DELAY_MS = 650;
const HINT_VISIBLE_MS = 6000;

interface Props {
  level: Level;
  /** Run the tutorial even if it was completed before (Settings > Replay tutorial). */
  forceTutorial?: boolean;
  onExit(): void;
  onNext?: () => void;
}

export function GameScreen({ level, forceTutorial, onExit, onNext }: Props) {
  const insets = useSafeAreaInsets();
  const { theme: labTheme } = useCosmetics();
  const isDaily = level.number === 0;
  const session = useGameStore((s) => s.session);
  const selected = useGameStore((s) => s.selected);
  const lastEvents = useGameStore((s) => s.lastEvents);
  const shake = useGameStore((s) => s.shake);
  const deadlocked = useGameStore(selectDeadlocked);
  const coins = useProgressStore((s) => s.save.economy.coins);
  const completion = useProgressStore((p) => p.lastCompletion);
  const dailyResult = useProgressStore((p) => p.lastDaily);

  const [busy, setBusy] = useState(false);
  const [winPlaying, setWinPlaying] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [hinting, setHinting] = useState(false);
  const [hintTubes, setHintTubes] = useState<number[]>([]);
  const winTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const recorded = useRef(false);
  const mounted = useRef(true);

  const [tutorialDoneAtStart] = useState(() => useProgressStore.getState().save.progress.tutorialDone);
  const tutorialEligible = level.tutorial === 'basics' && (!!forceTutorial || !tutorialDoneAtStart);
  // a resumed, half-played board skips the tutorial rather than restarting it
  const [tutStep, setTutStep] = useState<TutorialStep>(() =>
    tutorialEligible && (useGameStore.getState().session?.current.moves ?? 0) === 0 ? 0 : 4);
  const tutorialActive = tutStep < 4;

  // the mixing tutorial: first play of the first chapter 6 level, or forced from Settings
  const [mixTutorialNew] = useState(() => !useProgressStore.getState().save.progress.levels[level.id]?.completions);
  const mixTutorialEligible = level.tutorial === 'mixing' && (!!forceTutorial || mixTutorialNew);
  const [mixStep, setMixStep] = useState<MixTutorialStep>(() =>
    mixTutorialEligible && (useGameStore.getState().session?.current.moves ?? 0) === 0 ? 0 : 3);
  const mixTutorialActive = mixStep < 3;

  const solved = !!session && isPuzzleSolved(session.current);

  const clearHint = useCallback(() => {
    hintTimers.current.forEach(clearTimeout);
    hintTimers.current = [];
    setHintTubes([]);
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; hintTimers.current.forEach(clearTimeout); };
  }, []);

  // play time while the app is in the foreground
  useEffect(() => {
    const id = setInterval(() => { if (AppState.currentState === 'active') useGameStore.getState().tick(1000); }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => { if (winTimer.current) clearTimeout(winTimer.current); audio.duckMusic(false); }, []);

  // record the completion as soon as the puzzle is solved, so closing the app mid-celebration still saves it
  useEffect(() => {
    if (!solved) {
      recorded.current = false;
      useProgressStore.getState().clearCompletion();
      useProgressStore.getState().clearDaily();
      return;
    }
    if (recorded.current || !session) return;
    recorded.current = true;
    const progress = useProgressStore.getState();
    if (isDaily) {
      const r = progress.recordDaily(level, session);
      void leaderboard.submitDaily(r.dateKey, r.moves, r.timeMs);
      analytics.track('daily_complete', { moves: r.moves, timeMs: r.timeMs, streak: r.streak });
    } else {
      const r = progress.recordCompletion(level, session);
      analytics.track('level_complete', { level: level.id, moves: r.moves, stars: r.stars });
    }
    void persistence.clearSession();
  }, [solved, session, level, isDaily]);

  const onTap = useCallback((tube: number) => {
    const store = useGameStore.getState();
    if (tutorialActive && !tutorialAllowsTap(tutStep, tube)) return;
    clearHint();
    const before = store.session?.current;
    const action = store.tap(tube);
    if (!action) return;
    if (tutorialActive && before) setTutStep(advanceTutorial(tutStep, action, before));
    if (mixTutorialActive) setMixStep(advanceMixTutorial(mixStep, action, useGameStore.getState().lastEvents.some((e) => e.type === 'mixed')));
    switch (action.type) {
      case 'select':
      case 'moveSelection': haptics.trigger('select'); audio.play('glassTap'); break;
      case 'deselect': audio.play('glassTap'); break;
      case 'shake': audio.play('invalid'); if (action.warn) haptics.trigger('invalid'); break;
      case 'pour': break; // pour sound and haptic start with the animation
    }
  }, [tutorialActive, tutStep, mixTutorialActive, mixStep, clearHint]);

  const onMechanic = useCallback((kind: 'reveal' | 'thaw' | 'unlock' | 'catalyst' | 'mix') => {
    audio.play(kind === 'reveal' ? 'reveal' : kind === 'thaw' ? 'thaw' : kind === 'mix' ? 'mix' : 'unlock');
    haptics.trigger(kind === 'catalyst' ? 'tubeComplete' : 'select');
  }, []);

  const finishWin = useCallback(() => {
    if (winTimer.current) clearTimeout(winTimer.current);
    winTimer.current = null;
    setWinPlaying(false);
    setOverlayVisible(true);
    audio.duckMusic(false);
  }, []);

  // toasts once the overlay is up: achievements, new cosmetics, new lab equipment
  useEffect(() => {
    if (!overlayVisible) return;
    const toasts: { kind: 'achievement' | 'info'; title: string; message: string }[] = [];
    const ach = isDaily ? dailyResult?.achievements : completion?.achievements;
    for (const a of ach ?? []) toasts.push({ kind: 'achievement', title: a.name.toUpperCase(), message: `Achievement unlocked. +${a.reward} coins` });
    for (const id of (isDaily ? dailyResult?.unlockedCosmetics : completion?.unlockedCosmetics) ?? []) {
      const c = COSMETIC_BY_ID[id];
      if (c) toasts.push({ kind: 'info', title: 'NEW IN COLLECTION', message: `${c.name} unlocked.` });
    }
    for (const id of completion?.unlockedEquipment ?? []) {
      const e = LAB_EQUIPMENT.find((x) => x.id === id);
      if (e) toasts.push({ kind: 'info', title: 'LABORATORY UPGRADE', message: `${e.name} installed.` });
    }
    const timers = toasts.map((t, i) => setTimeout(() => {
      useToastStore.getState().show(t);
      audio.play(t.kind === 'achievement' ? 'unlock' : 'coin');
    }, 600 + i * 700));
    if ((isDaily ? dailyResult?.coinsEarned : completion?.coinsEarned) ?? 0) audio.play('coin');
    return () => timers.forEach(clearTimeout);
  }, [overlayVisible, completion, dailyResult, isDaily]);

  const onSolved = useCallback(() => {
    audio.play('win');
    audio.duckMusic(true);
    haptics.trigger('levelComplete');
    setWinPlaying(true);
    winTimer.current = setTimeout(finishWin, WIN_SEQUENCE_MS);
  }, [finishWin]);

  const restart = useCallback(() => {
    const go = () => {
      audio.play('button'); clearHint(); setOverlayVisible(false); setWinPlaying(false);
      useGameStore.getState().restart(); if (tutorialEligible) setTutStep(0); if (mixTutorialEligible) setMixStep(0);
    };
    const moves = useGameStore.getState().session?.current.moves ?? 0;
    if (moves >= 5) {
      Alert.alert('Restart level?', 'Your progress on this level will be lost.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restart', style: 'destructive', onPress: go },
      ]);
    } else go();
  }, [tutorialEligible, mixTutorialEligible, clearHint]);

  const effectiveNumber = level.number; // 0 (daily) uses the paid rates
  const addTube = useCallback(() => {
    const cost = extraTubeCost(effectiveNumber);
    if (cost > 0 && !useProgressStore.getState().spend(cost)) {
      useToastStore.getState().show({ kind: 'warn', title: 'NOT ENOUGH COINS', message: `An extra tube costs ${cost} coins.` });
      return;
    }
    audio.play('button');
    clearHint();
    useGameStore.getState().addTube();
  }, [effectiveNumber, clearHint]);

  const onHint = useCallback(async () => {
    const store = useGameStore.getState();
    const s = store.session;
    if (!s || hinting) return;
    const cost = hintCost(effectiveNumber, s.hintsUsed);
    if (useProgressStore.getState().save.economy.coins < cost) return;
    clearHint();
    setHinting(true);
    const board = s.current;
    const result = await findHint(board, { level }); // sliced across frames; never blocks animation
    if (!mounted.current) return;
    setHinting(false);
    // the player moved on while the search ran: drop the stale answer
    if (useGameStore.getState().session?.current !== board) return;
    const toast = useToastStore.getState().show;
    if (result.kind === 'unsolvable') {
      toast({ kind: 'warn', title: 'HINT', message: 'This mixture is unstable — try Undo.' });
      return;
    }
    if (result.kind !== 'move') {
      if (result.kind === 'unknown') toast({ kind: 'info', title: 'HINT', message: 'No hint available right now.' });
      return;
    }
    if (cost > 0 && !useProgressStore.getState().spend(cost)) return;
    store.addHintUsed();
    analytics.track('hint_used', { level: level.id, cost });
    audio.play('button');
    setHintTubes([result.move.from]);
    hintTimers.current.push(setTimeout(() => setHintTubes([result.move.from, result.move.to]), HINT_RING_DELAY_MS));
    hintTimers.current.push(setTimeout(() => setHintTubes([]), HINT_VISIBLE_MS));
    const under = board.tubes[result.move.to].liquids.at(-1);
    toast({
      kind: 'info', title: 'HINT',
      message: isMixPour(board, result.move.from, result.move.to) && under
        ? `Try mixing ${COLOR_NAMES[result.color].toUpperCase()} into ${COLOR_NAMES[under.color].toUpperCase()}.`
        : `Try moving ${COLOR_NAMES[result.color].toUpperCase()} here.`,
    });
  }, [hinting, effectiveNumber, clearHint, level]);

  if (!session) return null;
  const { moves } = session.current;
  const stars = calculateStars(moves, level, session);
  const cost = extraTubeCost(effectiveNumber);
  const nextHintCost = hintCost(effectiveNumber, session.hintsUsed);
  const highlight = tutorialActive ? tutorialHighlight(tutStep) : hintTubes;

  return (
    <View style={[styles.root, { backgroundColor: labTheme.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
      <TopBar
        levelNumber={level.number} moves={moves} stars={stars} coins={coins} onBack={onExit}
        title={isDaily ? 'DAILY EXPERIMENT' : undefined} showStars={!isDaily}
      />

      <ReactorMeter level={level} moves={moves} />
      <MechanicsNote level={level} />
      <RecipeLegend level={level} />

      {tutorialActive && <TutorialOverlay step={tutStep} canSkip={tutorialDoneAtStart} onSkip={() => setTutStep(4)} />}
      {mixTutorialActive && <TutorialOverlay kind="mixing" step={mixStep} canSkip onSkip={() => setMixStep(3)} />}

      <View style={styles.board}>
        <GameBoard
          level={level}
          current={session.current}
          events={lastEvents}
          selected={selected}
          shake={shake}
          onTap={onTap}
          onBackgroundTap={() => { const s = useGameStore.getState().selected; if (s !== null) onTap(s); }}
          highlight={highlight}
          onPourStart={() => { haptics.trigger('pour'); audio.play('pour'); }}
          onTubeComplete={() => { audio.play('tubeComplete'); haptics.trigger('tubeComplete'); }}
          onSolved={onSolved}
          onMechanic={onMechanic}
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
        onUndo={() => { audio.play('button'); clearHint(); useGameStore.getState().undo(); }}
        onRestart={restart}
        onAddTube={addTube}
        onHint={onHint}
        hintCost={nextHintCost}
        hinting={hinting}
      />

      {overlayVisible && !isDaily && completion && solved && (
        <WinOverlay
          result={completion}
          hasNext={!!onNext}
          onNext={() => onNext?.()}
          onReplay={() => { setOverlayVisible(false); setWinPlaying(false); useGameStore.getState().restart(); }}
          onLevels={onExit}
        />
      )}
      {overlayVisible && isDaily && dailyResult && solved && (
        <DailyWinOverlay
          result={dailyResult}
          onReplay={() => { setOverlayVisible(false); setWinPlaying(false); useGameStore.getState().restart(); }}
          onHome={onExit}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  board: { flex: 1, marginHorizontal: 8 },
  banner: { backgroundColor: 'rgba(255,138,31,0.15)', borderColor: '#FF8A1F', borderWidth: 1, borderRadius: 12, marginHorizontal: 16, padding: 10 },
  bannerText: { color: '#FF8A1F', textAlign: 'center' },
});
