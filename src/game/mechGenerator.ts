import { levelCanonicalKey } from './canonical';
import { dealTubes, GENERATOR_VERSION } from './generator';
import type { GenerateOptions } from './generator';
import { tubeFromString } from './levelCodec';
import { hasMechanics } from './mechSolver';
import { applyMove, createSession } from './session';
import { solveLevel } from './solver';
import type { Condition, Difficulty, Level, LiquidColor, TubeDef } from './types';
import { createRng } from '../utils/seededRandom';
import type { Rng } from '../utils/seededRandom';

export type CondKind = 'moves' | 'tubes' | 'color';

/** How a chapter 3-5 level is built from a classic deal (section 11). */
export interface Recipe {
  colors: number;
  /** Ordinary empty tubes (besides any locked ones). */
  empties: number;
  /** Tubes whose bottom layers start frozen. */
  frozen?: { tubes: number; layers: number; cond: CondKind };
  /** Tubes whose layers below the top start hidden; 'all' hides in every filled tube. */
  hidden?: { tubes: number | 'all' };
  /** Locked tubes: `empty` extra empty ones, `filled` that hold liquid. */
  locked?: { empty?: number; filled?: number; cond: CondKind };
  /** A catalyst tube whose effect helps a mechanic tube (created if the recipe has none). */
  catalyst?: { effect: 'unlock' | 'thaw' | 'reveal' };
  reactor?: { slack: number; bonusCoins: number };
}

export interface MechSpec {
  number: number;
  chapter: number;
  difficulty: Difficulty;
  recipe: Recipe;
  optMin: number;
  optMax: number;
  /** Required extra moves over the same deal without the mechanic (default 1; catalyst levels need the catalyst in the best line instead). */
  minGain?: number;
}

const COLORS: LiquidColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
/** A late backup condition so a catalyst effect is a real shortcut, not the only way. */
const BACKUP: Condition = { type: 'movesMade', count: 40 };

const pick = <T,>(rng: Rng, items: T[]): T => items[rng.int(items.length)];

function condition(rng: Rng, kind: CondKind, avoid: LiquidColor[], colors: LiquidColor[]): Condition {
  if (kind === 'moves') return { type: 'movesMade', count: 3 + rng.int(5) };
  if (kind === 'tubes') return { type: 'tubesCompleted', count: 1 + rng.int(2) };
  const options = colors.filter((c) => !avoid.includes(c));
  return { type: 'colorCompleted', color: pick(rng, options.length ? options : colors) };
}

/** Build one candidate level from a recipe. Pure in the rng stream. */
export function buildCandidate(spec: MechSpec, seed: string, rng: Rng): Level {
  const r = spec.recipe;
  const colors = COLORS.slice(0, r.colors);
  const rows = dealTubes(rng, colors, r.empties);
  const tubes: TubeDef[] = rows.map((row, i) => tubeFromString(`T${i + 1}`, row));
  const filled = () => tubes.map((_, i) => i).filter((i) => tubes[i].liquids.length > 0);
  const claimed = new Set<number>(); // tubes that already carry a rule

  const choose = (n: number, from = filled()): number[] => {
    const pool = rng.shuffle(from.filter((i) => !claimed.has(i)));
    return pool.slice(0, n);
  };

  if (r.hidden) {
    const idx = r.hidden.tubes === 'all' ? filled() : choose(r.hidden.tubes);
    for (const i of idx) {
      const t = tubes[i];
      t.liquids = t.liquids.map((l, k) => (k < t.liquids.length - 1 ? { ...l, hidden: true } : l));
    }
  }

  let frozenIdx: number[] = [];
  if (r.frozen || r.catalyst?.effect === 'thaw') {
    const f = r.frozen ?? { tubes: 1, layers: 2, cond: 'moves' as CondKind };
    frozenIdx = choose(f.tubes);
    for (const i of frozenIdx) {
      const t = tubes[i];
      t.liquids = t.liquids.map((l, k) => (k < f.layers && !l.hidden ? { ...l, frozen: true } : l));
      const frozenColors = t.liquids.filter((l) => l.frozen).map((l) => l.color);
      t.thawWhen = r.catalyst?.effect === 'thaw' ? BACKUP : condition(rng, f.cond, frozenColors, colors);
      claimed.add(i);
    }
  }

  const lockedIdx: number[] = [];
  if (r.locked || r.catalyst?.effect === 'unlock') {
    const l = r.locked ?? { filled: 1, cond: 'moves' as CondKind };
    for (const i of choose(l.filled ?? 0)) {
      const t = tubes[i];
      const own = t.liquids.map((x) => x.color);
      t.lock = { unlockWhen: r.catalyst?.effect === 'unlock' ? BACKUP : condition(rng, l.cond, own, colors) };
      lockedIdx.push(i);
      claimed.add(i);
    }
    for (let k = 0; k < (l.empty ?? 0); k++) {
      tubes.push({ id: `T${tubes.length + 1}`, capacity: 4, liquids: [], lock: { unlockWhen: r.catalyst?.effect === 'unlock' ? BACKUP : condition(rng, l.cond, [], colors) } });
      lockedIdx.push(tubes.length - 1);
      claimed.add(tubes.length - 1);
    }
  }

  if (r.catalyst) {
    const host = pick(rng, tubes.map((_, i) => i).filter((i) => !claimed.has(i)));
    const effect = r.catalyst.effect;
    const hiddenIdx = tubes.map((_, i) => i).filter((i) => tubes[i].liquids.some((l) => l.hidden));
    const target = effect === 'unlock' ? pick(rng, lockedIdx) : effect === 'thaw' ? pick(rng, frozenIdx) : pick(rng, hiddenIdx);
    const present = [...new Set(tubes.flatMap((t) => t.liquids.map((l) => l.color)))];
    tubes[host].catalyst = {
      triggerColor: pick(rng, present),
      effect: { type: effect === 'unlock' ? 'unlockTube' : effect === 'thaw' ? 'thawTube' : 'revealTube', tubeId: tubes[target].id },
    };
  }

  return {
    id: `L${String(spec.number).padStart(3, '0')}`,
    number: spec.number,
    chapter: spec.chapter,
    difficulty: spec.difficulty,
    tubes,
    optimalMoves: 0,
    optimalIsExact: false,
    meta: { generatorVersion: GENERATOR_VERSION, seed },
  };
}

const strip = (level: Level): Level => ({
  ...level,
  tubes: level.tubes.map((t) => ({ id: t.id, capacity: t.capacity, liquids: t.liquids.map((l) => ({ color: l.color })) })),
});

export interface MechResult { level: Level; attempts: number; classicOptimal: number }

export function generateMechLevel(spec: MechSpec, seed: string, opts: GenerateOptions & { solveNodes?: number } = {}): MechResult | null {
  const rng = createRng(`${GENERATOR_VERSION}:${seed}`);
  const max = opts.maxAttempts ?? 4000;
  const solve = { maxNodes: opts.solveNodes ?? 120_000, fallbackNodes: 0 };
  for (let attempt = 1; attempt <= max; attempt++) {
    const draft = buildCandidate(spec, seed, rng);
    if (!hasMechanics(draft)) continue;
    const res = solveLevel(draft, solve);
    if (res.solvable !== true || !res.exact || res.optimal === undefined) continue;
    if (res.optimal < spec.optMin || res.optimal > spec.optMax) continue;

    // the mechanic must matter: it changes the answer, or (catalyst) the best line uses it
    const classic = solveLevel(strip(draft), { maxNodes: 300_000, fallbackNodes: 0 });
    const classicOptimal = classic.optimal ?? 0;
    if (spec.recipe.catalyst) {
      let s = createSession(draft);
      let used = false;
      for (const m of res.solution!) {
        const r = applyMove(s, m);
        if (r.events.some((e) => e.type === 'catalystActivated')) used = true;
        s = r.session;
      }
      if (!used) continue;
    } else if (res.optimal < classicOptimal + (spec.minGain ?? 1)) continue;

    const key = levelCanonicalKey(draft);
    if (opts.seen?.has(key)) continue;
    opts.seen?.add(key);

    const reactor = spec.recipe.reactor;
    const level: Level = {
      ...draft,
      optimalMoves: res.optimal,
      optimalIsExact: true,
      ...(reactor ? { rules: { reactor: { moveLimit: res.optimal + reactor.slack, bonusCoins: reactor.bonusCoins } } } : {}),
    };
    return { level, attempts: attempt, classicOptimal };
  }
  return null;
}
