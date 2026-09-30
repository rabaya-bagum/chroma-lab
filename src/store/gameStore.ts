import { create } from 'zustand';
import { resolveTap } from '../game/interaction';
import type { TapAction } from '../game/interaction';
import { isDeadlocked, isPuzzleSolved } from '../game/rules';
import { calculateStars } from '../game/scoring';
import { addExtraTube, applyMove, createSession, restartLevel, undoMove } from '../game/session';
import type { GameEvent, Level, Session } from '../game/types';

interface GameStore {
  session: Session | null;
  selected: number | null;
  /** Events from the most recent move, for the UI to animate from. */
  lastEvents: GameEvent[];
  /** Bumped on every shake request so the UI can key an animation on it. */
  shake: { tube: number; nonce: number } | null;
  start(level: Level): void;
  tap(tube: number): TapAction | null;
  undo(): void;
  restart(): void;
  addTube(): void;
  clear(): void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  session: null,
  selected: null,
  lastEvents: [],
  shake: null,

  start: (level) => set({ session: createSession(level, Date.now()), selected: null, lastEvents: [], shake: null }),

  tap: (tube) => {
    const { session, selected, shake } = get();
    if (!session || isPuzzleSolved(session.current)) return null;
    const action = resolveTap(session.current, selected, tube);
    switch (action.type) {
      case 'select':
      case 'moveSelection':
        set({ selected: action.tube });
        break;
      case 'deselect':
        set({ selected: null });
        break;
      case 'pour': {
        const r = applyMove(session, { from: action.from, to: action.to });
        set({ session: r.session, selected: null, lastEvents: r.events });
        break;
      }
      case 'shake':
        set({ shake: { tube: action.tube, nonce: (shake?.nonce ?? 0) + 1 } });
        break;
    }
    return action;
  },

  undo: () => {
    const { session } = get();
    const next = session && undoMove(session);
    if (next) set({ session: next, selected: null, lastEvents: [] });
  },

  restart: () => {
    const { session } = get();
    if (session) set({ session: restartLevel(session, Date.now()), selected: null, lastEvents: [] });
  },

  addTube: () => {
    const { session } = get();
    if (session) set({ session: addExtraTube(session) });
  },

  clear: () => set({ session: null, selected: null, lastEvents: [], shake: null }),
}));

/** Derived values, kept out of the store so selectors stay cheap and granular. */
export const selectSolved = (s: GameStore) => !!s.session && isPuzzleSolved(s.session.current);
export const selectDeadlocked = (s: GameStore) => !!s.session && isDeadlocked(s.session.current);
export const selectStars = (s: GameStore) =>
  s.session && isPuzzleSolved(s.session.current)
    ? calculateStars(s.session.current.moves, s.session.level, s.session)
    : null;
