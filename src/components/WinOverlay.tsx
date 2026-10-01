import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { theme } from '../config/theme';
import type { DailyResult } from '../game/daily';
import type { CompletionResult } from '../game/progress';
import { useReduceMotion } from '../store/settingsStore';
import { CoinDisplay } from './CoinDisplay';
import { GlowButton } from './GlowButton';
import { Icon } from './Icon';
import { StarRow } from './StarRow';

const STAR_STEP_MS = 320;
const COUNT_MS = 800;

interface Props {
  result: CompletionResult;
  hasNext: boolean;
  onNext(): void;
  onReplay(): void;
  onLevels(): void;
}

/** EXPERIMENT COMPLETE: stars appear one by one, coins count up (§9). */
export function WinOverlay({ result, hasNext, onNext, onReplay, onLevels }: Props) {
  const reduce = useReduceMotion();
  const [shownStars, setShownStars] = useState(reduce ? result.stars : 0);
  const [coins, setCoins] = useState(reduce ? result.coinsEarned : 0);
  const rise = useSharedValue(reduce ? 1 : 0);

  useEffect(() => {
    if (reduce) return;
    rise.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= result.stars; i++) timers.push(setTimeout(() => setShownStars(i), 350 + (i - 1) * STAR_STEP_MS));
    const start = 350 + result.stars * STAR_STEP_MS;
    const steps = 20;
    for (let k = 1; k <= steps; k++) timers.push(setTimeout(() => setCoins(Math.round((result.coinsEarned * k) / steps)), start + (COUNT_MS * k) / steps));
    return () => timers.forEach(clearTimeout);
  }, [reduce, result.stars, result.coinsEarned, rise]);

  const card = useAnimatedStyle(() => ({ opacity: rise.value, transform: [{ translateY: (1 - rise.value) * 24 }] }));

  return (
    <View style={styles.scrim} accessibilityViewIsModal>
      <Animated.View style={[styles.card, card]} accessibilityLiveRegion="polite">
        <Text maxFontSizeMultiplier={1.3} style={styles.title} accessibilityRole="header">EXPERIMENT COMPLETE</Text>
        <StarRow count={shownStars} size={34} />
        <View style={styles.stats}>
          <Stat label="MOVES" value={String(result.moves)} />
          <Stat label="BEST" value={String(result.bestMoves)} />
        </View>
        {result.isNewBest && <Text style={styles.newBest}>NEW BEST</Text>}
        <View style={styles.coinRow} accessible accessibilityLabel={`${result.coinsEarned} coins earned`}>
          <Text style={styles.earned}>EARNED</Text>
          <CoinDisplay coins={coins} />
        </View>
        {result.reactorBonus > 0 && <Text maxFontSizeMultiplier={1.3} style={styles.newBest} accessibilityLabel={`Reactor bonus ${result.reactorBonus} coins`}>REACTOR BONUS  +{result.reactorBonus}</Text>}
        {result.achievements.map((a) => (
          <View key={a.id} style={styles.ach} accessible accessibilityLabel={`Achievement unlocked: ${a.name}, ${a.reward} coins`}>
            <Icon name="hint" size={16} color="#FFD84D" />
            <Text maxFontSizeMultiplier={1.3} style={styles.achText}>{a.name}  +{a.reward}</Text>
          </View>
        ))}
        <View style={styles.buttons}>
          {hasNext && <GlowButton primary label="NEXT" accessibilityLabel="Next experiment" onPress={onNext} />}
          <GlowButton label="REPLAY" onPress={onReplay} />
          <GlowButton label="LEVELS" onPress={onLevels} />
        </View>
      </Animated.View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label.toLowerCase()} ${value}`}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text maxFontSizeMultiplier={1.3} style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,9,20,0.72)', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 20 },
  card: { width: '100%', maxWidth: 420, alignItems: 'center', gap: 12, backgroundColor: 'rgba(18,27,51,0.98)', borderColor: theme.accent, borderWidth: 1, borderRadius: 20, padding: 20 },
  title: { color: theme.accent, fontSize: 18, fontWeight: '800', letterSpacing: 3 },
  stats: { flexDirection: 'row', gap: 32 },
  stat: { alignItems: 'center' },
  statLabel: { color: theme.textDim, fontSize: 10, letterSpacing: 2 },
  statValue: { color: theme.text, fontSize: 24, fontWeight: '800' },
  newBest: { color: '#FFD84D', fontWeight: '800', letterSpacing: 2, fontSize: 12 },
  coinRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  earned: { color: theme.textDim, fontSize: 11, letterSpacing: 2 },
  ach: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  achText: { color: '#FFD84D', fontWeight: '700' },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 4 },
});

interface DailyProps {
  result: DailyResult;
  onReplay(): void;
  onHome(): void;
}

const fmtTime = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;

/** Results for the Daily Experiment: moves, time, streak and coins. */
export function DailyWinOverlay({ result, onReplay, onHome }: DailyProps) {
  const reduce = useReduceMotion();
  const [coins, setCoins] = useState(reduce ? result.coinsEarned : 0);
  useEffect(() => {
    if (reduce) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let k = 1; k <= 20; k++) timers.push(setTimeout(() => setCoins(Math.round((result.coinsEarned * k) / 20)), 300 + (COUNT_MS * k) / 20));
    return () => timers.forEach(clearTimeout);
  }, [reduce, result.coinsEarned]);

  return (
    <View style={styles.scrim} accessibilityViewIsModal>
      <View style={styles.card} accessibilityLiveRegion="polite">
        <Text maxFontSizeMultiplier={1.3} style={styles.title} accessibilityRole="header">EXPERIMENT COMPLETE</Text>
        <Text style={styles.earned}>DAILY EXPERIMENT</Text>
        <View style={styles.stats}>
          <Stat label="MOVES" value={String(result.moves)} />
          <Stat label="TIME" value={fmtTime(result.timeMs)} />
          <Stat label="STREAK" value={String(result.streak)} />
        </View>
        {!result.firstCompletion && <Text style={styles.newBest}>BEST: {result.bestMoves} MOVES, {fmtTime(result.bestTimeMs)}</Text>}
        {result.coinsEarned > 0 && (
          <View style={styles.coinRow} accessible accessibilityLabel={`${result.coinsEarned} coins earned, including ${result.streakBonus} streak bonus`}>
            <Text style={styles.earned}>EARNED</Text>
            <CoinDisplay coins={coins} />
          </View>
        )}
        {result.achievements.map((a) => (
          <View key={a.id} style={styles.ach} accessible accessibilityLabel={`Achievement unlocked: ${a.name}, ${a.reward} coins`}>
            <Icon name="hint" size={16} color="#FFD84D" />
            <Text maxFontSizeMultiplier={1.3} style={styles.achText}>{a.name}  +{a.reward}</Text>
          </View>
        ))}
        <View style={styles.buttons}>
          <GlowButton primary label="DONE" onPress={onHome} />
          <GlowButton label="REPLAY" onPress={onReplay} />
        </View>
      </View>
    </View>
  );
}
