import { COLOR_LETTERS } from './levelCodec';
import { createInitialState } from './session';
import type { GameState, Level, Move } from './types';

export interface SolveResult {
  solvable: boolean | 'unknown';
  solution?: Move[];
  optimal?: number;
  /** True when `optimal` is proven minimal (or unsolvability is proven). */
  exact: boolean;
  nodes: number;
}

export interface SolveOptions {
  /** Node budget for the exact A* pass. */
  maxNodes?: number;
  /** If the exact pass runs out, run weighted A* with this node budget for any solution. */
  fallbackNodes?: number;
  fallbackWeight?: number;
}

export const DEFAULT_SOLVE_OPTIONS: Required<SolveOptions> = {
  maxNodes: 1_500_000,
  fallbackNodes: 400_000,
  fallbackWeight: 3,
};

// --- compact classic representation -----------------------------------------
// A tube is a string: one capacity char, then one letter per unit (bottom -> top).
// It is kept separate from GameState for speed; tests replay every solution
// through the real engine so the two cannot drift apart.

const CAP_OFFSET = 48;
const capOf = (t: string) => t.charCodeAt(0) - CAP_OFFSET;
const sizeOf = (t: string) => t.length - 1;
const topOf = (t: string) => t[t.length - 1];

function topRun(t: string): number {
  const c = topOf(t);
  let n = 0;
  for (let i = t.length - 1; i >= 1 && t[i] === c; i--) n++;
  return n;
}

function isFullUniform(t: string): boolean {
  return sizeOf(t) === capOf(t) && topRun(t) === sizeOf(t);
}

function encode(state: GameState): string[] {
  return state.tubes.map((t) => {
    if (t.locked || t.liquids.some((l) => l.frozen || l.hidden)) {
      throw new Error('Solver does not support locked, frozen or hidden liquid yet (Phase 5)');
    }
    return String.fromCharCode(CAP_OFFSET + t.capacity) + t.liquids.map((l) => COLOR_LETTERS[l.color]).join('');
  });
}

const keyOf = (tubes: string[]) => tubes.slice().sort().join(',');

function isGoal(tubes: string[]): boolean {
  for (const t of tubes) if (sizeOf(t) > 0 && !isFullUniform(t)) return false;
  return true;
}

/** Number of maximal same-colour runs across all tubes. */
function runCount(tubes: string[]): number {
  let s = 0;
  for (const t of tubes) {
    for (let i = 1; i < t.length; i++) if (i === 1 || t[i] !== t[i - 1]) s++;
  }
  return s;
}

/**
 * Admissible, consistent heuristic: runs - (complete tubes at the goal).
 * A pour changes the run count by at most one (a whole top run merges onto
 * another run), and the goal has exactly one run per complete tube.
 * This is tighter than counting boundaries between layers, which it dominates.
 */
function goalRuns(tubes: string[]): number {
  const minCap = Math.min(...tubes.map(capOf));
  const units: Record<string, number> = {};
  for (const t of tubes) for (let i = 1; i < t.length; i++) units[t[i]] = (units[t[i]] ?? 0) + 1;
  return Object.values(units).reduce((a, n) => a + Math.floor(n / minCap), 0);
}

interface Node {
  tubes: string[];   // original tube order, so recorded moves are valid indices
  g: number;
  parent: number;
  from: number;
  to: number;
}

class MinHeap {
  private f: number[] = [];
  private g: number[] = [];
  private id: number[] = [];
  get size() { return this.f.length; }
  private less(i: number, j: number) {
    // lower f first; on ties prefer deeper nodes (larger g)
    return this.f[i] < this.f[j] || (this.f[i] === this.f[j] && this.g[i] > this.g[j]);
  }
  private swap(i: number, j: number) {
    [this.f[i], this.f[j]] = [this.f[j], this.f[i]];
    [this.g[i], this.g[j]] = [this.g[j], this.g[i]];
    [this.id[i], this.id[j]] = [this.id[j], this.id[i]];
  }
  push(f: number, g: number, id: number) {
    this.f.push(f); this.g.push(g); this.id.push(id);
    let i = this.f.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(i, p)) break;
      this.swap(i, p);
      i = p;
    }
  }
  pop(): number {
    const top = this.id[0];
    const lastF = this.f.pop()!, lastG = this.g.pop()!, lastId = this.id.pop()!;
    if (this.f.length > 0) {
      this.f[0] = lastF; this.g[0] = lastG; this.id[0] = lastId;
      let i = 0;
      const n = this.f.length;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < n && this.less(l, m)) m = l;
        if (r < n && this.less(r, m)) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }
}

export interface SearchOutcome {
  status: 'solved' | 'exhausted' | 'budget';
  solution?: Move[];
  nodes: number;
}

/** How many node expansions pass between checks of `shouldYield`. */
const YIELD_CHECK_EVERY = 64;

/**
 * Resumable A* over compact states. `run` expands nodes until the search ends
 * or `shouldYield()` says to pause; call `run` again to continue. This is what
 * lets the runtime hint solver work in short slices between frames (§10.4).
 */
export class Search {
  private readonly nodes: Node[];
  private readonly best: Map<string, number>;
  private readonly open = new MinHeap();
  private readonly X: number;
  private expansions = 0;

  constructor(start: string[], private readonly weight: number, private readonly maxNodes: number) {
    this.X = goalRuns(start);
    this.nodes = [{ tubes: start, g: 0, parent: -1, from: -1, to: -1 }];
    this.best = new Map([[keyOf(start), 0]]);
    this.open.push(weight * this.h(start), 0, 0);
  }

  get nodeCount(): number { return this.nodes.length; }

  private h(tubes: string[]): number { return Math.max(0, runCount(tubes) - this.X); }

  /** Returns the outcome, or null if paused by `shouldYield`. */
  run(shouldYield?: () => boolean): SearchOutcome | null {
    const { nodes, best, open, weight } = this;
    while (open.size > 0) {
      if (shouldYield && this.expansions % YIELD_CHECK_EVERY === 0 && this.expansions > 0 && shouldYield()) {
        this.expansions++; // so a resumed run does not immediately re-check at the same count
        return null;
      }
      this.expansions++;
      const id = open.pop();
      const node = nodes[id];
      const key = keyOf(node.tubes);
      if (best.get(key)! < node.g) continue; // stale entry
      if (isGoal(node.tubes)) {
        const solution: Move[] = [];
        for (let n = id; nodes[n].parent >= 0; n = nodes[n].parent) {
          solution.push({ from: nodes[n].from, to: nodes[n].to });
        }
        return { status: 'solved', solution: solution.reverse(), nodes: nodes.length };
      }
      if (nodes.length >= this.maxNodes) return { status: 'budget', nodes: nodes.length };

      const { tubes } = node;
      for (let from = 0; from < tubes.length; from++) {
        const a = tubes[from];
        if (sizeOf(a) === 0 || isFullUniform(a)) continue; // empty, or sealed
        const run = topRun(a);
        const c = topOf(a);
        const tried = new Set<string>();
        for (let to = 0; to < tubes.length; to++) {
          if (to === from) continue;
          const b = tubes[to];
          const free = capOf(b) - sizeOf(b);
          if (free === 0) continue;
          if (sizeOf(b) > 0 && topOf(b) !== c) continue;
          if (sizeOf(b) === 0 && run === sizeOf(a)) continue;  // pointless relabel
          if (tried.has(b)) continue;                          // identical destination already tried
          tried.add(b);
          const amount = Math.min(run, free);
          const next = tubes.slice();
          next[from] = a.slice(0, a.length - amount);
          next[to] = b + c.repeat(amount);
          const g = node.g + 1;
          const nk = keyOf(next);
          const seen = best.get(nk);
          if (seen !== undefined && seen <= g) continue;       // also prunes immediate reversals
          best.set(nk, g);
          nodes.push({ tubes: next, g, parent: id, from, to });
          open.push(g + weight * this.h(next), g, nodes.length - 1);
        }
      }
    }
    return { status: 'exhausted', nodes: nodes.length };
  }
}

function search(start: string[], weight: number, maxNodes: number): SearchOutcome {
  return new Search(start, weight, maxNodes).run()!;
}

/** Compact encoding of a runtime state for `Search` (throws for mechanics the solver cannot model yet). */
export const encodeState = (state: GameState): string[] => encode(state);

/** Solve a runtime state. Exact optimum if the budget allows, otherwise best effort. */
export function solveState(state: GameState, options: SolveOptions = {}): SolveResult {
  const o = { ...DEFAULT_SOLVE_OPTIONS, ...options };
  const start = encode(state);
  const exact = search(start, 1, o.maxNodes);
  if (exact.status === 'solved') {
    return { solvable: true, solution: exact.solution, optimal: exact.solution!.length, exact: true, nodes: exact.nodes };
  }
  if (exact.status === 'exhausted') return { solvable: false, exact: true, nodes: exact.nodes };

  const approx = search(start, o.fallbackWeight, o.fallbackNodes);
  const nodes = exact.nodes + approx.nodes;
  if (approx.status === 'solved') {
    return { solvable: true, solution: approx.solution, optimal: approx.solution!.length, exact: false, nodes };
  }
  return { solvable: approx.status === 'exhausted' ? false : 'unknown', exact: approx.status === 'exhausted', nodes };
}

export function solveLevel(level: Level, options?: SolveOptions): SolveResult {
  return solveState(createInitialState(level), options);
}
