import { levelCanonicalKey } from './canonical';
import { dealRowOk, GENERATOR_VERSION } from './generator';
import { BACKUP, condition, pick } from './mechGenerator';
import type { CondKind } from './mechGenerator';
import type { GenerateOptions } from './generator';
import { tubeFromString } from './levelCodec';
import { RBY_PAIRS } from './mixing';
import { applyMove, createSession } from './session';
import { solveLevel } from './solver';
import type { Condition, Difficulty, Level, LiquidColor, MixPair, TubeDef } from './types';
import { createRng } from '../utils/seededRandom';
import type { Rng } from '../utils/seededRandom';

export type PairName = keyof typeof RBY_PAIRS;

/** How a chapter 6 level is built (§11.6). */
export interface MixRecipe {
  /** Units per colour letter, e.g. { R: 2, B: 2, C: 4 }. The total must fill whole tubes. */
  counts: Record<string, number>;
  pairs: PairName[];
  /** Ordinary empty tubes. */
  empties: number;
  hidden?: { tubes: number | 'all' };
  /** One extra empty tube that opens after some moves. */
  locked?: boolean;
  /** Tubes whose bottom layers start frozen (chapter 7). */
  frozen?: { tubes: number; layers: number; cond: CondKind };
  /**
   * A catalyst whose trigger colour may be a mix result, so mixing opens the way.
   * The target tube keeps a late backup condition so the catalyst is a shortcut, not the only route.
   */
  catalyst?: { effect: 'unlock' | 'thaw' | 'reveal' };
  reactor?: { slack: number; bonusCoins: number };
}

export interface MixSpec {
  number: number;
  chapter: number;
  difficulty: Difficulty;
  recipe: MixRecipe;
  optMin: number;
  optMax: number;
  tutorial?: 'mixing';
}

const CAPACITY = 4;
const LOCK: Condition = { type: 'movesMade', count: 4 };

/**
 * A level needs mixing when it cannot be solved with mixing off. Without mixing
 * every colour keeps its unit count, and a complete tube holds exactly four of
 * one colour, so any colour whose count is not a multiple of four makes the
 * board unsolvable. This proof is exact and needs no search.
 */
export function needsMixing(level: Level): boolean {
  const counts = new Map<string, number>();
  for (const t of level.tubes) for (const l of t.liquids) counts.set(l.color, (counts.get(l.color) ?? 0) + 1);
  return [...counts.values()].some((n) => n % CAPACITY !== 0);
}

function deal(rng: Rng, counts: Record<string, number>, empties: number): string[] {
  const pool = Object.entries(counts).flatMap(([letter, n]) => Array<string>(n).fill(letter));
  if (pool.length % CAPACITY !== 0) throw new Error('Mixing recipe units must fill whole tubes');
  const filled = pool.length / CAPACITY;
  for (;;) {
    const units = rng.shuffle(pool);
    const rows: string[] = [];
    for (let i = 0; i < filled; i++) rows.push(units.slice(i * CAPACITY, (i + 1) * CAPACITY).join(''));
    if (rows.every((r) => dealRowOk(r, CAPACITY))) {
      for (let i = 0; i < empties; i++) rows.push('');
      return rows;
    }
  }
}

export function buildMixCandidate(spec: MixSpec, seed: string, rng: Rng): Level {
  const r = spec.recipe;
  const tubes: TubeDef[] = deal(rng, r.counts, r.empties).map((row, i) => tubeFromString(`T${i + 1}`, row));
  if (r.hidden) {
    const filled = tubes.map((_, i) => i).filter((i) => tubes[i].liquids.length > 0);
    const idx = r.hidden.tubes === 'all' ? filled : rng.shuffle(filled).slice(0, r.hidden.tubes);
    for (const i of idx) {
      const t = tubes[i];
      t.liquids = t.liquids.map((l, k) => (k < t.liquids.length - 1 ? { ...l, hidden: true } : l));
    }
  }
  const present = [...new Set(tubes.flatMap((t) => t.liquids.map((l) => l.color)))] as LiquidColor[];
  const claimed = new Set<number>();
  let frozenIdx: number[] = [];
  if (r.frozen || r.catalyst?.effect === 'thaw') {
    const f = r.frozen ?? { tubes: 1, layers: 2, cond: 'moves' as CondKind };
    const pool = rng.shuffle(tubes.map((_, i) => i).filter((i) => tubes[i].liquids.length > 0 && !tubes[i].liquids.some((l) => l.hidden)));
    frozenIdx = pool.slice(0, f.tubes);
    for (const i of frozenIdx) {
      const t = tubes[i];
      t.liquids = t.liquids.map((l, k) => (k < f.layers ? { ...l, frozen: true } : l));
      const frozenColors = t.liquids.filter((l) => l.frozen).map((l) => l.color);
      t.thawWhen = r.catalyst?.effect === 'thaw' ? BACKUP : condition(rng, f.cond, frozenColors, present);
      claimed.add(i);
    }
  }
  const lockedIdx: number[] = [];
  if (r.locked) {
    tubes.push({ id: `T${tubes.length + 1}`, capacity: CAPACITY, liquids: [], lock: { unlockWhen: r.catalyst?.effect === 'unlock' ? BACKUP : LOCK } });
    lockedIdx.push(tubes.length - 1);
    claimed.add(tubes.length - 1);
  }
  if (r.catalyst) {
    const effect = r.catalyst.effect;
    const hiddenIdx = tubes.map((_, i) => i).filter((i) => tubes[i].liquids.some((l) => l.hidden));
    const targets = effect === 'unlock' ? lockedIdx : effect === 'thaw' ? frozenIdx : hiddenIdx;
    if (targets.length > 0) {
      const target = pick(rng, targets);
      const hosts = tubes.map((_, i) => i).filter((i) => !claimed.has(i) && i !== target);
      const results = r.pairs.map((p) => RBY_PAIRS[p].result);
      tubes[pick(rng, hosts)].catalyst = {
        triggerColor: pick(rng, [...present, ...results]),
        effect: { type: effect === 'unlock' ? 'unlockTube' : effect === 'thaw' ? 'thawTube' : 'revealTube', tubeId: tubes[target].id },
      };
    }
  }
  const pairs: MixPair[] = r.pairs.map((p) => ({ ...RBY_PAIRS[p] }));
  return {
    id: `L${String(spec.number).padStart(3, '0')}`,
    number: spec.number,
    chapter: spec.chapter,
    difficulty: spec.difficulty,
    tubes,
    optimalMoves: 0,
    optimalIsExact: false,
    rules: {
      mixing: { pairs },
      ...(r.reactor ? { reactor: { moveLimit: 0, bonusCoins: r.reactor.bonusCoins } } : {}),
    },
    ...(spec.tutorial ? { tutorial: spec.tutorial } : {}),
    meta: { generatorVersion: GENERATOR_VERSION, seed },
  };
}

export interface MixResult { level: Level; attempts: number; mixes: number }

/** Deterministic generation of one mixing level. The result is proven solvable, optimal, and unsolvable without mixing. */
export function generateMixLevel(spec: MixSpec, seed: string, opts: GenerateOptions & { solveNodes?: number } = {}): MixResult | null {
  const rng = createRng(`${GENERATOR_VERSION}:${seed}`);
  const max = opts.maxAttempts ?? 4000;
  const solve = { maxNodes: opts.solveNodes ?? 150_000, fallbackNodes: 0 };
  for (let attempt = 1; attempt <= max; attempt++) {
    const draft = buildMixCandidate(spec, seed, rng);
    if (!needsMixing(draft)) continue;
    const res = solveLevel(draft, solve);
    if (res.solvable !== true || !res.exact || res.optimal === undefined) continue;
    if (res.optimal < spec.optMin || res.optimal > spec.optMax) continue;

    let mixes = 0;
    let catalysts = 0;
    let s = createSession(draft);
    for (const m of res.solution!) {
      const r = applyMove(s, m);
      mixes += r.events.filter((e) => e.type === 'mixed').length;
      catalysts += r.events.filter((e) => e.type === 'catalystActivated').length;
      s = r.session;
    }
    if (mixes === 0) continue;
    if (spec.recipe.catalyst && catalysts === 0) continue; // the catalyst must be part of the best line

    const key = levelCanonicalKey(draft);
    if (opts.seen?.has(key)) continue;
    opts.seen?.add(key);
    const rules = { ...draft.rules, ...(spec.recipe.reactor ? { reactor: { moveLimit: res.optimal + spec.recipe.reactor.slack, bonusCoins: spec.recipe.reactor.bonusCoins } } : {}) };
    return { level: { ...draft, rules, optimalMoves: res.optimal, optimalIsExact: true }, attempts: attempt, mixes };
  }
  return null;
}
