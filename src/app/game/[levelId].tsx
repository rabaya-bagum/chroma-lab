import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { LEVELS } from '../../data/levels';
import { GameScreen } from '../../screens/GameScreen';
import { persistence } from '../../services/persistence';
import { useGameStore } from '../../store/gameStore';
import { leaveGame, playLevel } from '../../utils/navigation';

export default function GameRoute() {
  const { levelId, tutorial } = useLocalSearchParams<{ levelId: string; tutorial?: string }>();
  const level = LEVELS.find((l) => l.id === levelId);
  const hasSession = useGameStore((s) => s.session?.level.id === levelId);

  // deep link or reload without a prepared session: start the level
  useEffect(() => {
    if (level && !useGameStore.getState().session) useGameStore.getState().start(level);
  }, [level]);

  // leaving the screen (button, swipe or hardware back) ends the visit and removes the saved session (§15)
  useEffect(() => () => {
    const s = useGameStore.getState().session;
    if (s && s.level.id === levelId) { useGameStore.getState().clear(); void persistence.clearSession(); }
  }, [levelId]);

  if (!level) return <Redirect href="/levels" />;
  if (!hasSession) return null;

  const next = LEVELS[LEVELS.indexOf(level) + 1];
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
