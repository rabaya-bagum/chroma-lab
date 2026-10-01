import { pourLiquid } from './pour';
import { getValidMoves, isPuzzleSolved } from './rules';
import type { SearchOutcome } from './solver';
import type { Condition, GameState, Level, MixPair, Move, TubeState } from './types';
import { COLOR_LETTERS } from './levelCodec';

/** True if the level uses any section 11 mechanic, so the fast classic solver cannot be used. */
export function hasMechanics(level: Level): boolean {
  return !!level.rules?.mixing || level.tubes.some((t) => t.lock || t.thawWhen || t.catalyst || t.liquids.some((l) => l.frozen || l.hidden));
}

const movesThreshold = (c: Condition | undefined) => (c?.type === 'movesMade' ? c.count : 0);

const layerTok = (l: TubeState['liquids'][number]) => COLOR_LETTERS[l.color] + (l.frozen ? '^' : l.hidden ? '?' : '');
const tubeTok = (t: TubeState) =>
  String.fromCharCode(48 + t.capacity) + (t.locked ? 'L' : '') + (t.catalystSpent ? 'S' : '') + t.liquids.map(layerTok).join('');

/**
 * Canonical state key. Tubes that carry rules, or that a rule refers to, keep
 * their positions; the rest are interchangeable and sorted. The move count is
 * part of the key only while a "movesMade" condition could still change.
 */
function makeKeyer(level: Level): (s: GameState) => string {
  const fixed = new Set<string>();
  let maxMoves = 0;
  for (const t of level.tubes) {
    if (t.lock || t.thawWhen || t.catalyst) fixed.add(t.id);
    if (t.catalyst) fixed.add(t.catalyst.effect.tubeId);
    maxMoves = Math.max(maxMoves, movesThreshold(t.lock?.unlockWhen), movesThreshold(t.thawWhen));
  }
  return (s) => {
    const fixedToks: string[] = [];
    const plain: string[] = [];
    for (const t of s.tubes) (fixed.has(t.id) ? fixedToks : plain).push(tubeTok(t));
    return fixedToks.join(',') + '/' + plain.sort().join(',') + (maxMoves > 0 ? '|' + Math.min(s.moves, maxMoves) : '');
  };
}

/** Colour runs across all tubes (true colours, so hidden layers count). */
function runCount(s: GameState): number {
  let n = 0;
  for (const t of s.tubes) {
    for (let i = 0; i < t.liquids.length; i++) if (i === 0 || t.liquids[i].color !== t.liquids[i - 1].color) n++;
  }
  return n;
}

/** Complete tubes at the goal: one per `minCapacity` units of each colour. */
function goalRuns(s: GameState): number {
  const minCap = Math.min(...s.tubes.map((t) => t.capacity));
  if (s.mix) return Math.floor(s.tubes.reduce((n, t) => n + t.liquids.length, 0) / minCap);
  const units: Record<string, number> = {};
  for (const t of s.tubes) for (const l of t.liquids) units[l.color] = (units[l.color] ?? 0) + 1;
  return Object.values(units).reduce((a, n) => a + Math.floor(n / minCap), 0);
}

/**
 * Lower bound on the pours a mixing board still needs. A normal pour removes at
 * most one colour run; a mixing pour at most two (the poured unit's run and a
 * merge of the new pair with the layer below). Mixing consumes one unit of each
 * input colour, so there are at most floor(inputUnits / 2) of them, or, if a
 * result colour can itself be mixed again, floor(units / 2).
 */
function mixHeuristic(s: GameState, pairs: readonly MixPair[], runs: number, goal: number): number {
  const d = runs - goal;
  if (d <= 0) return 0;
  const inputs = new Set<string>();
  const results = new Set<string>();
  for (const p of pairs) { inputs.add(p.a); inputs.add(p.b); results.add(p.result); }
  const chained = [...results].some((c) => inputs.has(c));
  let units = 0;
  for (const t of s.tubes) for (const l of t.liquids) if (chained || inputs.has(l.color)) units++;
  const maxMix = Math.floor(units / 2);
  return Math.max(Math.ceil(d / 2), d - maxMix);
}

interface Node { state: GameState; g: number; parent: number; from: number; to: number }

class Heap {
  private a: { f: number; g: number; id: number }[] = [];
  get size() { return this.a.length; }
  private less(i: number, j: number) {
    const x = this.a[i], y = this.a[j];
    return x.f < y.f || (x.f === y.f && x.g > y.g);
  }
  push(f: number, g: number, id: number) {
    this.a.push({ f, g, id });
    let i = this.a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(i, p)) break;
      [this.a[i], this.a[p]] = [this.a[p], this.a[i]];
      i = p;
    }
  }
  pop(): number {
    const top = this.a[0].id;
    const last = this.a.pop()!;
    if (this.a.length > 0) {
      this.a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < this.a.length && this.less(l, m)) m = l;
        if (r < this.a.length && this.less(r, m)) m = r;
        if (m === i) break;
        [this.a[i], this.a[m]] = [this.a[m], this.a[i]];
        i = m;
      }
    }
    return top;
  }
}

const YIELD_CHECK_EVERY = 16;

/**
 * Resumable A* over real game states, using the engine's own `pourLiquid` so
 * every mechanic (locks, frozen and hidden layers, catalysts, conditions) is
 * modelled exactly as played, hidden layers by their true colour.
 *
 * Admissible heuristic: colour runs minus goal runs. A pour changes the run
 * count by at most one, and reveals, thaws and unlocks never change it. Mixing
 * levels use `mixHeuristic`, since a mixing pour can remove two runs.
 */
export class MechSearch {
  private readonly nodes: Node[];
  private readonly best = new Map<string, number>();
  private readonly open = new Heap();
  private readonly keyOf: (s: GameState) => string;
  private readonly X: number;
  private readonly pairs: readonly MixPair[] | undefined;
  private expansions = 0;

  constructor(private readonly level: Level, start: GameState, private readonly weight: number, private readonly maxNodes: number) {
    this.keyOf = makeKeyer(level);
    this.X = goalRuns(start);
    this.pairs = level.rules?.mixing?.pairs;
    this.nodes = [{ state: start, g: 0, parent: -1, from: -1, to: -1 }];
    this.best.set(this.keyOf(start), 0);
    this.open.push(weight * this.h(start), 0, 0);
  }

  get nodeCount() { return this.nodes.length; }
  private h(s: GameState) {
    const runs = runCount(s);
    return this.pairs ? mixHeuristic(s, this.pairs, runs, this.X) : Math.max(0, runs - this.X);
  }

  run(shouldYield?: () => boolean): SearchOutcome | null {
    const { nodes, best, open, weight, level } = this;
    while (open.size > 0) {
      if (shouldYield && this.expansions > 0 && this.expansions % YIELD_CHECK_EVERY === 0 && shouldYield()) {
        this.expansions++;
        return null;
      }
      this.expansions++;
      const id = open.pop();
      const node = nodes[id];
      if (best.get(this.keyOf(node.state))! < node.g) continue; // stale
      if (isPuzzleSolved(node.state)) {
        const solution: Move[] = [];
        for (let n = id; nodes[n].parent >= 0; n = nodes[n].parent) solution.push({ from: nodes[n].from, to: nodes[n].to });
        return { status: 'solved', solution: solution.reverse(), nodes: nodes.length };
      }
      if (nodes.length >= this.maxNodes) return { status: 'budget', nodes: nodes.length };

      for (const m of getValidMoves(node.state)) {
        const { state } = pourLiquid(level, node.state, m.from, m.to);
        const g = node.g + 1;
        const key = this.keyOf(state);
        const seen = best.get(key);
        if (seen !== undefined && seen <= g) continue;
        best.set(key, g);
        nodes.push({ state, g, parent: id, from: m.from, to: m.to });
        open.push(g + weight * this.h(state), g, nodes.length - 1);
      }
    }
    return { status: 'exhausted', nodes: nodes.length };
  }
}
