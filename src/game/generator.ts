import { stateKey, levelCanonicalKey } from './canonical';
import { COLOR_LETTERS, defineLevel, tubeFromString } from './levelCodec';
import { getMeaningfulMoves, isDeadlocked, isPuzzleSolved } from './rules';
import { pourLiquid } from './pour';
import { createInitialState } from './session';
import { solveLevel } from './solver';
import type { SolveOptions } from './solver';
import type { Difficulty, GameState, Level, LiquidColor } from './types';
import { DEFAULT_CAPACITY } from './types';
import { createRng } from '../utils/seededRandom';
import type { Rng } from '../utils/seededRandom';

export const GENERATOR_VERSION = 'g1';

export interface LevelSpec {
  /** Overrides the default `L###` id (the daily puzzle uses `daily-<date>`). */
  id?: string;
  number: number;
  chapter: number;
  difficulty: Difficulty;
  colors: LiquidColor[];
  empties: number;
  optMin: number;
  optMax: number;
}

export interface LevelMetrics {
  optimal: number;
  branching: number;      // meaningful moves in the initial state
  deadEndRate: number;    // fraction of random playouts that deadlock
}

const LETTERS = Object.fromEntries(Object.entries(COLOR_LETTERS).map(([c, l]) => [c, l])) as Record<LiquidColor, string>;

/** Deal `colors x capacity` units into `colors` tubes plus empty tubes, honouring §10.3 constraints. */
export function dealTubes(rng: Rng, colors: LiquidColor[], empties: number, capacity = DEFAULT_CAPACITY): string[] {
  const pool = colors.flatMap((c) => Array<string>(capacity).fill(LETTERS[c]));
  for (;;) {
    const units = rng.shuffle(pool);
    const rows: string[] = [];
    for (let i = 0; i < colors.length; i++) rows.push(units.slice(i * capacity, (i + 1) * capacity).join(''));
    if (rows.every((r) => dealRowOk(r, capacity))) {
      for (let i = 0; i < empties; i++) rows.push('');
      return rows;
    }
  }
}

/** No tube with all units the same colour, and no top run of 3 or more. */
export function dealRowOk(row: string, capacity = DEFAULT_CAPACITY): boolean {
  if (row.length !== capacity) return false;
  if ([...row].every((c) => c === row[0])) return false;
  let run = 0;
  for (let i = row.length - 1; i >= 0 && row[i] === row[row.length - 1]; i--) run++;
  return run < 3;
}

/** Fraction of random playouts (over meaningful moves) that end deadlocked. */
export function deadEndRate(level: Level, rng: Rng, playouts = 200, maxMoves = 300): number {
  let dead = 0;
  for (let p = 0; p < playouts; p++) {
    let state: GameState = createInitialState(level);
    for (let i = 0; i < maxMoves; i++) {
      if (isPuzzleSolved(state)) break;
      const moves = getMeaningfulMoves(state);
      if (moves.length === 0) { if (isDeadlocked(state)) dead++; break; }
      const m = moves[rng.int(moves.length)];
      state = pourLiquid(level, state, m.from, m.to).state;
    }
  }
  return dead / playouts;
}

export interface GenerateOptions {
  solve?: SolveOptions;
  maxAttempts?: number;
  /** Canonical keys of levels already accepted (duplicates are rejected). */
  seen?: Set<string>;
}

export interface GenerateResult {
  level: Level;
  metrics: LevelMetrics;
  attempts: number;
}

/**
 * One deterministic stream of candidate deals for a spec and seed. `tryNext`
 * makes a single attempt, so callers can interleave generation with other work
 * (the Daily Experiment generates on-device in short slices). The outcome
 * depends only on the seed and attempt count, never on timing.
 */
export class LevelGenerator {
  private readonly rng: Rng;
  attempts = 0;

  constructor(private readonly spec: LevelSpec, private readonly seed: string, private readonly opts: GenerateOptions = {}) {
    this.rng = createRng(`${GENERATOR_VERSION}:${seed}`);
  }

  /** One attempt. Returns an accepted level, or null to try again. */
  tryNext(): GenerateResult | null {
    const { spec, seed, opts, rng } = this;
    this.attempts++;
    const tubes = dealTubes(rng, spec.colors, spec.empties);
    const draft = defineLevel({
      id: spec.id ?? `L${String(spec.number).padStart(3, '0')}`,
      number: spec.number,
      chapter: spec.chapter,
      difficulty: spec.difficulty,
      optimalMoves: 0,
      optimalIsExact: false,
      tubes,
      meta: { generatorVersion: GENERATOR_VERSION, seed },
    });
    const solved = solveLevel(draft, opts.solve);
    if (solved.solvable !== true || solved.optimal === undefined) return null;
    const optimal = solved.optimal;
    if (optimal < spec.optMin || optimal > spec.optMax) return null;

    const branching = getMeaningfulMoves(createInitialState(draft)).length;
    if (branching < 3) return null; // too trivial
    const key = levelCanonicalKey(draft);
    if (opts.seen?.has(key)) return null;

    const level: Level = { ...draft, optimalMoves: optimal, optimalIsExact: solved.exact };
    const metrics: LevelMetrics = { optimal, branching, deadEndRate: deadEndRate(level, rng) };
    opts.seen?.add(key);
    return { level, metrics, attempts: this.attempts };
  }
}

/**
 * Deterministically generate a level for `spec` from `seed` (§10.3).
 * Returns null if no deal within `maxAttempts` fits the spec.
 */
export function generateLevel(spec: LevelSpec, seed: string, opts: GenerateOptions = {}): GenerateResult | null {
  const gen = new LevelGenerator(spec, seed, opts);
  const maxAttempts = opts.maxAttempts ?? 50_000;
  while (gen.attempts < maxAttempts) {
    const r = gen.tryNext();
    if (r) return r;
  }
  return null;
}

// Re-exported so scripts have one import for level plumbing.
export { stateKey, tubeFromString };
