import { COLOR_NAMES } from '../config/theme';
import { describeCondition } from './conditions';
import type { CatalystEffect, Level } from './types';

const effectText = (e: CatalystEffect): string =>
  e.type === 'unlockTube' ? 'unlock a tube' : e.type === 'thawTube' ? 'thaw a tube' : 'reveal a tube';

/**
 * Plain-language rules for the mechanics a level uses, one short sentence each
 * (shown under the top bar and read by screen readers). Empty for classic levels.
 */
export function describeMechanics(level: Level): string[] {
  const lines: string[] = [];
  const frozen = level.tubes.filter((t) => t.liquids.some((l) => l.frozen) && t.thawWhen);
  if (frozen.length) lines.push(`Frozen layers cannot move. They thaw ${[...new Set(frozen.map((t) => describeCondition(t.thawWhen!)))].join(' / ')}.`);
  if (level.tubes.some((t) => t.liquids.some((l) => l.hidden))) lines.push('Mystery layers show their colour once uncovered.');
  const locked = level.tubes.filter((t) => t.lock);
  if (locked.length) lines.push(`Locked tubes open ${[...new Set(locked.map((t) => describeCondition(t.lock!.unlockWhen)))].join(' / ')}.`);
  for (const t of level.tubes) {
    if (t.catalyst) lines.push(`Pour ${COLOR_NAMES[t.catalyst.triggerColor].toLowerCase()} into the glowing tube to ${effectText(t.catalyst.effect)}.`);
  }
  if (level.rules?.mixing) lines.push('Pour a colour onto a different one to mix a new colour. One drop moves, and the tube needs room.');
  if (level.rules?.reactor) lines.push(`Reactor: finish within ${level.rules.reactor.moveLimit} moves for a bonus.`);
  return lines;
}
