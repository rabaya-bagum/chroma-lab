/*
 * Throwaway prototype for the colour-mixing design (docs/COLOUR_MIXING_DESIGN.md).
 * It models the candidate rules in a minimal standalone engine so we can measure them
 * before touching src/game. Nothing here is imported by the app.
 *
 * Candidate rules (the design under test):
 *  - Only three pairs mix: R+B -> V, B+Y -> G, R+Y -> O. Mixed colours are inert.
 *  - A "mix pour" moves exactly ONE unit of A onto a tube whose top unit is B (A != B, mixable).
 *    The poured unit and that top unit become TWO units of the mix colour (volume is conserved).
 *  - Everything else is the classic rule. Goal: every tube empty or full of one colour.
 */
import { createRng } from '../../src/utils/seededRandom';
import type { Rng } from '../../src/utils/seededRandom';

const CAP = 4;
const MIX: Record<string, string> = { RB: 'V', BR: 'V', BY: 'G', YB: 'G', RY: 'O', YR: 'O' };

type Tubes = string[]; // each tube bottom->top, letters

const key = (t: Tubes) => t.slice().sort().join(',');
const full = (s: string) => s.length === CAP && [...s].every((c) => c === s[0]);
const goal = (t: Tubes) => t.every((s) => s.length === 0 || full(s));

function runLen(s: string): number {
  let n = 0;
  for (let i = s.length - 1; i >= 0 && s[i] === s[s.length - 1]; i--) n++;
  return n;
}

interface Move { from: number; to: number; mix: boolean; next: Tubes }

function moves(t: Tubes, allowMix = true): Move[] {
  const out: Move[] = [];
  for (let a = 0; a < t.length; a++) {
    const A = t[a];
    if (A.length === 0 || full(A)) continue;
    const c = A[A.length - 1];
    for (let b = 0; b < t.length; b++) {
      if (a === b) continue;
      const B = t[b];
      if (B.length >= CAP) continue;
      const bt = B[B.length - 1];
      if (B.length === 0 || bt === c) {
        const run = runLen(A);
        if (B.length === 0 && run === A.length) continue; // pointless relabel
        const amount = Math.min(run, CAP - B.length);
        const n = t.slice();
        n[a] = A.slice(0, A.length - amount);
        n[b] = B + c.repeat(amount);
        out.push({ from: a, to: b, mix: false, next: n });
      } else if (allowMix && MIX[c + bt]) {
        const m = MIX[c + bt];
        const n = t.slice();
        n[a] = A.slice(0, A.length - 1);
        n[b] = B.slice(0, B.length - 1) + m + m; // volume conserved: 1 + 1 units -> 2 units
        out.push({ from: a, to: b, mix: true, next: n });
      }
    }
  }
  return out;
}

/** Admissible heuristic: runs minus the (constant) number of complete tubes at the goal. */
let HEUR: 'runs' | 'halved' | 'tight' | 'zero' = 'runs';
function h(t: Tubes, goalRuns: number): number {
  if (HEUR === 'zero') return 0;
  let s = 0;
  for (const x of t) for (let i = 0; i < x.length; i++) if (i === 0 || x[i] !== x[i - 1]) s++;
  const d = Math.max(0, s - goalRuns);
  // a mix pour can merge into an existing run of the mix colour and remove two runs at once,
  // so the safe bound halves the excess
  if (HEUR === 'halved') return Math.ceil(d / 2);
  if (HEUR === 'tight') {
    // Only a mix pour can remove two runs; every other pour removes at most one. Each mix pour
    // consumes two different primary units, so the number of mix pours left is bounded.
    let r = 0, b = 0, y = 0;
    for (const x of t) for (const c of x) { if (c === 'R') r++; else if (c === 'B') b++; else if (c === 'Y') y++; }
    const p = r + b + y;
    const maxMix = Math.min(Math.floor(p / 2), p - Math.max(r, b, y));
    return Math.max(Math.ceil(d / 2), d - maxMix);
  }
  return d;
}

interface Solve { solvable: boolean | 'unknown'; optimal?: number; nodes: number; mixes?: number }

function solve(start: Tubes, allowMix = true, maxNodes = 400_000): Solve {
  const total = start.reduce((n, s) => n + s.length, 0);
  const X = total / CAP;
  const nodes: { t: Tubes; g: number; parent: number; mix: boolean }[] = [{ t: start, g: 0, parent: -1, mix: false }];
  const best = new Map<string, number>([[key(start), 0]]);
  // simple binary heap on [f, -g, id]
  const heap: [number, number, number][] = [[h(start, X), 0, 0]];
  const less = (a: [number, number, number], b: [number, number, number]) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  const push = (e: [number, number, number]) => { heap.push(e); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (!less(heap[i], heap[p])) break; [heap[i], heap[p]] = [heap[p], heap[i]]; i = p; } };
  const pop = () => { const top = heap[0]; const last = heap.pop()!; if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && less(heap[l], heap[m])) m = l; if (r < heap.length && less(heap[r], heap[m])) m = r; if (m === i) break; [heap[i], heap[m]] = [heap[m], heap[i]]; i = m; } } return top; };
  while (heap.length) {
    const [, , id] = pop();
    const n = nodes[id];
    if (best.get(key(n.t))! < n.g) continue;
    if (goal(n.t)) {
      let mixes = 0;
      for (let k = id; nodes[k].parent >= 0; k = nodes[k].parent) if (nodes[k].mix) mixes++;
      return { solvable: true, optimal: n.g, nodes: nodes.length, mixes };
    }
    if (nodes.length >= maxNodes) return { solvable: 'unknown', nodes: nodes.length };
    for (const m of moves(n.t, allowMix)) {
      const g = n.g + 1;
      const k = key(m.next);
      const seen = best.get(k);
      if (seen !== undefined && seen <= g) continue;
      best.set(k, g);
      nodes.push({ t: m.next, g, parent: id, mix: m.mix });
      push([g + h(m.next, X), -g, nodes.length - 1]);
    }
  }
  return { solvable: false, nodes: nodes.length };
}

// ---- level recipes ---------------------------------------------------------------
/** counts per letter -> a random deal into full tubes + 2 empties (no complete tube, no top run of 3+). */
function deal(rng: Rng, counts: Record<string, number>): Tubes {
  const pool = Object.entries(counts).flatMap(([c, n]) => Array<string>(n).fill(c));
  const filled = pool.length / CAP;
  for (;;) {
    const u = rng.shuffle(pool);
    const rows: string[] = [];
    for (let i = 0; i < filled; i++) rows.push(u.slice(i * CAP, (i + 1) * CAP).join(''));
    const ok = rows.every((r) => !(r.length === CAP && [...r].every((c) => c === r[0])) && runLen(r) < 3);
    if (ok) return [...rows, '', ''];
  }
}

const RECIPES: Record<string, Record<string, number>> = {
  'A  R2 B2 -> V4  + C4 P4':            { R: 2, B: 2, C: 4, P: 4 },
  'B  R2 B2 + B?  (V4)  3 pure':        { R: 2, B: 2, C: 4, P: 4, K: 4 },
  'C  two mixes: R2 B2 + B2? (R2 B4 Y2)': { R: 2, B: 4, Y: 2, C: 4 },
  'D  decoy: R4 B4 Y4 (mixing optional)': { R: 4, B: 4, Y: 4, C: 4 },
  'E  decoy: R4 B4 (mixing optional)':  { R: 4, B: 4, C: 4, P: 4 },
  'F  3 mix pours: R3 B3 V2 (V8)':      { R: 3, B: 3, V: 2, C: 4, P: 4 },
  'G  4 mix pours: R4 B4 + V0, want V8': { R: 4, B: 4, V: 4, C: 4 },
  'H  R2 Y2 O4 + B2 Y2 (2 groups)':     { R: 2, Y: 4, B: 2, O: 4, C: 4 },
};

function stats(xs: number[]) { const s = xs.slice().sort((a, b) => a - b); const q = (p: number) => s[Math.floor(p * (s.length - 1))]; return `min ${q(0)} med ${q(0.5)} p90 ${q(0.9)} max ${q(1)}`; }

const rng = createRng('mixing-prototype');
console.log('== 1. Feasibility and difficulty (exact solve of 60 random deals each) ==');
for (const [name, counts] of Object.entries(RECIPES)) {
  const opt: number[] = [], noMix: number[] = [], mixes: number[] = [], nodes: number[] = [];
  let unsolvable = 0, unknown = 0, needMix = 0; const t0 = Date.now();
  for (let i = 0; i < 60; i++) {
    const d = deal(rng, counts);
    const withMix = solve(d, true);
    if (withMix.solvable === false) { unsolvable++; continue; }
    if (withMix.solvable === 'unknown') { unknown++; continue; }
    opt.push(withMix.optimal!); mixes.push(withMix.mixes!); nodes.push(withMix.nodes);
    const without = solve(d, false);
    if (without.solvable === false) needMix++; else noMix.push(without.optimal!);
  }
  console.log(`${name.padEnd(42)} solvable ${opt.length}/60 (unsolvable ${unsolvable}, unknown ${unknown}) | optimal ${opt.length ? stats(opt) : '-'} | mix pours in best line ${mixes.length ? stats(mixes) : '-'} | mixing REQUIRED in ${needMix}/${opt.length} | nodes med ${nodes.length ? stats(nodes).split(' ')[3] : '-'} | ${Date.now() - t0}ms`);
}

console.log('\n== 2. How punishing is a wrong move? (mid-game positions sampled by random play; is the position after the move lost?) ==');
function randomWalk(start: Tubes, steps: number): Tubes | null {
  let t = start;
  for (let i = 0; i < steps; i++) { const ms = moves(t); if (!ms.length) return null; t = ms[rng.int(ms.length)].next; }
  return t;
}
for (const [name, counts] of Object.entries(RECIPES).filter(([n]) => /^[ABCFH]/.test(n))) {
  let mixTotal = 0, mixDead = 0, plainTotal = 0, plainDead = 0, positions = 0, noMixChoice = 0;
  for (let i = 0; i < 40; i++) {
    const d = deal(rng, counts);
    if (solve(d, true).solvable !== true) continue;
    const pos = randomWalk(d, 3 + rng.int(8));
    if (!pos || solve(pos, true).solvable !== true) continue; // sample only positions that are still winnable
    positions++;
    const ms = moves(pos);
    if (!ms.some((m) => m.mix)) noMixChoice++;
    for (const m of ms) {
      const r = solve(m.next, true, 100_000);
      if (r.solvable === 'unknown') continue;
      if (m.mix) { mixTotal++; if (r.solvable === false) mixDead++; } else { plainTotal++; if (r.solvable === false) plainDead++; }
    }
  }
  console.log(`${name.padEnd(42)} ${positions} winnable positions (${positions - noMixChoice} offer a mix) | move loses the level: mix pours ${mixDead}/${mixTotal} (${(100 * mixDead / Math.max(1, mixTotal)).toFixed(0)}%), ordinary pours ${plainDead}/${plainTotal} (${(100 * plainDead / Math.max(1, plainTotal)).toFixed(0)}%)`);
}

console.log('\n== 2b. Random play (uniform over valid moves, 300 moves max): how often does a player end stuck or in a lost position? ==');
for (const [name, counts] of Object.entries(RECIPES).filter(([n]) => /^[ABDF]/.test(n))) {
  let dead = 0, won = 0, runs = 0, mixedLost = 0;
  for (let i = 0; i < 12; i++) {
    const d = deal(rng, counts);
    for (let p = 0; p < 20; p++) {
      let t = d, usedMix = false; runs++;
      for (let k = 0; k < 300; k++) { if (goal(t)) break; const ms = moves(t).filter((m) => !(t[m.to] === '' && t[m.from].length === runLen(t[m.from]))); if (!ms.length) break; const m = ms[rng.int(ms.length)]; if (m.mix) usedMix = true; t = m.next; }
      if (goal(t)) won++; else { dead++; if (usedMix) mixedLost++; }
    }
  }
  console.log(`${name.padEnd(42)} reached the goal ${won}/${runs}, ended stuck ${dead}/${runs} (of those, mixed along the way: ${mixedLost})`);
}

console.log('\n== 3. Heuristic strength: nodes expanded, mixing vs the same deal without mixing allowed ==');
{
  const a: number[] = [], b: number[] = [];
  for (let i = 0; i < 30; i++) { const d = deal(rng, RECIPES['B  R2 B2 + B?  (V4)  3 pure']); const w = solve(d, true); const wo = solve(d, false); if (w.solvable === true) a.push(w.nodes); if (wo.solvable !== 'unknown') b.push(wo.nodes); }
  console.log(`nodes with mixing: ${stats(a)} | without: ${stats(b)}`);
}

console.log('\n== 4. Is the simple run-count heuristic still admissible with mixing? (compare optimum with a provably safe bound) ==');
{
  let diff = 0, total = 0; const nSimple: number[] = [], nHalf: number[] = [], nTight: number[] = [];
  for (const counts of Object.values(RECIPES)) {
    for (let i = 0; i < 40; i++) {
      const d = deal(rng, counts);
      HEUR = 'zero'; const exact = solve(d, true, 600_000);
      HEUR = 'runs'; const simple = solve(d, true, 600_000);
      HEUR = 'halved'; const half = solve(d, true, 600_000);
      HEUR = 'tight'; const tight = solve(d, true, 600_000);
      if (exact.solvable !== true) continue;
      total++; nSimple.push(simple.nodes); nHalf.push(half.nodes);
      if (simple.optimal !== exact.optimal) diff++;
      if (half.optimal !== exact.optimal) throw new Error('halved heuristic is not optimal?!');
      if (tight.optimal !== exact.optimal) throw new Error('tight heuristic is not optimal?!');
      nTight.push(tight.nodes);
    }
  }
  HEUR = 'runs';
  console.log(`deals checked: ${total}; simple heuristic returned a non-optimal length in ${diff} of them. nodes simple ${stats(nSimple)} | nodes halved ${stats(nHalf)} | nodes tight ${stats(nTight)}`);
}
