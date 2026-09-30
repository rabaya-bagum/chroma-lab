/* Re-solve every shipped level. Exits non-zero on any problem. Usage: npm run levels:verify */
import { LEVELS } from '../src/data/levels';
import { verifyLevel, verifyLevelSet } from '../src/game/verify';

const problems = [...verifyLevelSet(LEVELS), ...LEVELS.flatMap(verifyLevel)];
if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`OK: ${LEVELS.length} levels verified`);
