/* Prints the solution for a date's daily puzzle as JSON (used for end-to-end checks). */
import { generateDaily } from '../src/game/daily';
import { solveLevel } from '../src/game/solver';
import { localDateKey } from '../src/utils/date';

const key = process.argv[2] ?? localDateKey();
const level = generateDaily(key)!;
console.log(JSON.stringify({ key, moves: solveLevel(level).solution }));
