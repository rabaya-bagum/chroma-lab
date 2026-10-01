import type { GameSave } from '../game/save';
import type { Level } from '../game/types';

export interface AchievementDef { id: string; name: string; description: string; reward: number }

const defs: AchievementDef[] = [
  { id: 'first_reaction', name: 'First Reaction', description: 'Complete any level', reward: 25 },
  { id: 'perfect_formula', name: 'Perfect Formula', description: 'Earn 3 stars on a level', reward: 50 },
  { id: 'researcher', name: 'Researcher', description: 'Complete 10 levels', reward: 75 },
  { id: 'scientist', name: 'Scientist', description: 'Complete 50 levels', reward: 200 },
  { id: 'no_mistakes', name: 'No Mistakes', description: 'Complete a level from level 6 onward with no undos', reward: 50 },
  { id: 'efficiency_expert', name: 'Efficiency Expert', description: 'Finish a level in the fewest possible moves', reward: 100 },
  { id: 'weekly_research', name: 'Weekly Research', description: 'Reach a 7-day daily streak', reward: 150 },
  { id: 'master_chemist', name: 'Master Chemist', description: 'Complete an expert level', reward: 150 },
];

export const ACHIEVEMENT_LIST: readonly AchievementDef[] = defs;
export const ACHIEVEMENTS: Record<string, AchievementDef> = Object.fromEntries(defs.map((d) => [d.id, d]));

export interface CompletionContext { level: Level; moves: number; undosUsed: number; stars: number }

/**
 * Ids of achievements newly earned by this completion. `save` must already
 * include the completion (levelsCompleted, stars) and the existing unlocks.
 */
export function evaluateAchievements(save: GameSave, ctx: CompletionContext): string[] {
  const have = save.progress.achievements;
  const hit: string[] = [];
  const check = (id: string, ok: boolean) => { if (ok && !have[id]) hit.push(id); };
  const done = save.progress.stats.levelsCompleted;
  check('first_reaction', done >= 1);
  check('perfect_formula', ctx.stars === 3);
  check('researcher', done >= 10);
  check('scientist', done >= 50);
  check('no_mistakes', ctx.undosUsed === 0 && ctx.level.number >= 6);
  check('efficiency_expert', ctx.moves === ctx.level.optimalMoves && ctx.level.optimalIsExact);
  check('weekly_research', save.daily.streak >= 7);
  check('master_chemist', ctx.level.difficulty === 'expert');
  return hit;
}
