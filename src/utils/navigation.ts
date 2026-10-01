import { router } from 'expo-router';
import type { Level, Session } from '../game/types';
import { useGameStore } from '../store/gameStore';

/** Start a level fresh and open the game screen. */
export function playLevel(level: Level, opts: { tutorial?: boolean; replace?: boolean } = {}): void {
  useGameStore.getState().start(level);
  const href = { pathname: '/game/[levelId]', params: { levelId: level.id, ...(opts.tutorial ? { tutorial: '1' } : {}) } } as const;
  if (opts.replace) router.replace(href); else router.push(href);
}

/** Continue a saved in-progress session. */
export function resumeSession(session: Session): void {
  useGameStore.getState().resume(session);
  router.push({ pathname: '/game/[levelId]', params: { levelId: session.level.id } });
}

/**
 * Go back one screen, or to Home when there is nothing to go back to (the app
 * was reloaded or deep-linked onto this screen). A bare `router.back()` raises
 * "The action 'GO_BACK' was not handled" in that case.
 */
export function goBack(): void {
  if (router.canGoBack()) router.back(); else router.replace('/');
}

/** Leave the game screen, always landing somewhere sensible. */
export const leaveGame = goBack;
