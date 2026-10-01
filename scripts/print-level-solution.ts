/* Prints the optimal solution of a shipped level as JSON, with the engine events of each move
 * (used for end-to-end checks). Usage: tsx scripts/print-level-solution.ts L026 */
import { LEVELS } from '../src/data/levels';
import { applyMove, createSession } from '../src/game/session';
import { solveLevel } from '../src/game/solver';

const id = process.argv[2] ?? 'L026';
const level = LEVELS.find((l) => l.id === id)!;
const moves = solveLevel(level).solution!;
let s = createSession(level);
const events = moves.map((m) => {
  const r = applyMove(s, m);
  s = r.session;
  return r.events.map((e) => e.type).filter((t) => t !== 'poured');
});
console.log(JSON.stringify({ id, moves, events }));
