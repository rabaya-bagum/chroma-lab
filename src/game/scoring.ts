import type { Level, Session } from './types';

export const STAR_THREE_SLACK = 2;
export const STAR_TWO_SLACK = 8;

/** Stars for finishing in `moves` (§9). Using an extra tube caps the result at 2. */
export function calculateStars(
  moves: number,
  level: Level,
  session: Pick<Session, 'extraTubeUsed'>,
): 1 | 2 | 3 {
  const opt = level.optimalMoves;
  let stars: 1 | 2 | 3 = moves <= opt + STAR_THREE_SLACK ? 3 : moves <= opt + STAR_TWO_SLACK ? 2 : 1;
  if (session.extraTubeUsed && stars === 3) stars = 2;
  return stars;
}
