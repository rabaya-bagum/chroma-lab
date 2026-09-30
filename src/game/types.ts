// Core data model. Conventions: one LiquidLayer = one unit; liquids[0] is the
// BOTTOM of a tube and the last element is the TOP.

export type LiquidColor =
  | 'red' | 'blue' | 'yellow' | 'green'
  | 'purple' | 'orange' | 'cyan' | 'pink';

export interface LiquidLayer {
  color: LiquidColor;
  frozen?: boolean;   // §11.2
  hidden?: boolean;   // §11.3 (true colour is still stored)
}

export type Condition =
  | { type: 'movesMade'; count: number }
  | { type: 'tubesCompleted'; count: number }
  | { type: 'colorCompleted'; color: LiquidColor };

export type CatalystEffect =
  | { type: 'unlockTube'; tubeId: string }
  | { type: 'thawTube'; tubeId: string }
  | { type: 'revealTube'; tubeId: string };

// Static definition, as authored in level data
export interface TubeDef {
  id: string;
  capacity: number;
  liquids: LiquidLayer[];
  lock?: { unlockWhen: Condition };          // present = starts locked
  thawWhen?: Condition;                      // required if any layer is frozen
  catalyst?: { triggerColor: LiquidColor; effect: CatalystEffect };
}

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface Level {
  id: string;                // 'L001', 'daily-2026-09-30'
  number: number;            // display number (0 for daily)
  chapter: number;
  difficulty: Difficulty;
  tubes: TubeDef[];
  optimalMoves: number;
  optimalIsExact: boolean;   // true = proven by exhaustive search
  tutorial?: 'basics';
  rules?: {
    reactor?: { moveLimit: number; bonusCoins: number };  // §11.5
    // mixing: reserved, see §11.6
  };
  meta: { generatorVersion: string; seed: string };      // 'handcrafted' for authored
}

// Runtime state (immutable snapshots)
export interface TubeState {
  id: string;
  capacity: number;
  liquids: LiquidLayer[];
  locked: boolean;
  sealed: boolean;           // complete tubes are sealed, §5.3
  catalystSpent: boolean;
  isExtra: boolean;          // purchased extra tube
}

export interface GameState {
  levelId: string;
  tubes: TubeState[];
  moves: number;
}

export interface Move { from: number; to: number } // tube indices

export type GameEvent =
  | { type: 'poured'; from: number; to: number; color: LiquidColor; amount: number }
  | { type: 'tubeCompleted'; tube: number; color: LiquidColor }
  | { type: 'revealed'; tube: number; layerIndex: number; color: LiquidColor }
  | { type: 'thawed'; tube: number }
  | { type: 'unlocked'; tube: number }
  | { type: 'catalystActivated'; tube: number; effect: CatalystEffect }
  | { type: 'solved' };

export type MoveError =
  | 'sameTube' | 'sourceEmpty' | 'sourceLocked' | 'sourceSealed' | 'sourceFrozenTop'
  | 'destLocked' | 'destFull' | 'destFrozenTop' | 'colorMismatch';

export interface Session {
  level: Level;
  initial: GameState;
  history: GameState[];     // previous states, for undo
  current: GameState;
  undosUsed: number;
  hintsUsed: number;
  extraTubeUsed: boolean;
  startedAt: number;        // ms epoch
  elapsedMs: number;        // excludes time while app is backgrounded
}

export const ALL_COLORS: readonly LiquidColor[] = [
  'red', 'blue', 'yellow', 'green', 'purple', 'orange', 'cyan', 'pink',
];

export const DEFAULT_CAPACITY = 4;
