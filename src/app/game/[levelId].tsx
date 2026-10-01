import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { LEVELS } from '../../data/levels';
import { GameScreen } from '../../screens/GameScreen';
import { persistence } from '../../services/persistence';
import { useGameStore } from '../../store/gameStore';
import { leaveGame, playLevel } from '../../utils/navigation';

export default function GameRoute() {
  const { levelId, tutorial } = useLocalSearchParams<{ levelId: string; tutorial?: string }>();
  const sessionLevel = useGameStore((s) => (s.session?.level.id === levelId ? s.session.level : null));
  // the daily puzzle is not part of LEVELS; it comes from the prepared session
  const level = LEVELS.find((l) => l.id === levelId) ?? sessionLevel ?? undefined;
  const hasSession = !!sessionLevel;

  // deep link or reload without a prepared session for this level (none, or another level's): start the level
  useEffect(() => {
    if (level && useGameStore.getState().session?.level.id !== level.id) useGameStore.getState().start(level);
  }, [level]);

  // leaving the screen (button, swipe or hardware back) ends the visit and removes the saved session (§15)
  useEffect(() => () => {
    const s = useGameStore.getState().session;
    if (s && s.level.id === levelId) { useGameStore.getState().clear(); void persistence.clearSession(); }
  }, [levelId]);

  if (!level) return <Redirect href={levelId?.startsWith('daily-') ? '/daily' : '/levels'} />;
  if (!hasSession) return null;

  const index = LEVELS.indexOf(level);
  const next = index >= 0 ? LEVELS[index + 1] : undefined; // undefined for the daily puzzle
  return (
    <GameScreen
      key={level.id}
      level={level}
      forceTutorial={tutorial === '1'}
      onExit={leaveGame}
      onNext={next ? () => playLevel(next, { replace: true }) : undefined}
    />
  );
}
