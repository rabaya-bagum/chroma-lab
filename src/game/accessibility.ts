import { COLOR_NAMES } from '../config/theme';
import type { GameEvent, GameState, TubeState } from './types';

const name = (c: keyof typeof COLOR_NAMES) => COLOR_NAMES[c].toLowerCase();

/** Screen reader label, e.g. "Tube 3 of 8: bottom red, red, blue, top blue. 0 free spaces." */
export function describeTube(tube: TubeState, index: number, total: number, selected = false, extra?: string): string {
  const { liquids } = tube;
  let contents: string;
  if (liquids.length === 0) contents = 'empty';
  else if (liquids.length === 1) contents = `bottom and top ${liquids[0].hidden ? 'unknown' : name(liquids[0].color)}`;
  else {
    contents = liquids
      .map((l, i) => {
        const c = l.hidden ? 'unknown' : name(l.color);
        return i === 0 ? `bottom ${c}` : i === liquids.length - 1 ? `top ${c}` : c;
      })
      .join(', ');
  }
  const free = tube.capacity - liquids.length;
  const flags = [
    tube.sealed ? 'complete' : '',
    tube.locked ? 'locked' : '',
    extra ?? '',
    liquids.some((l) => l.frozen) ? `${liquids.filter((l) => l.frozen).length} frozen ${liquids.filter((l) => l.frozen).length === 1 ? 'layer' : 'layers'}` : '',
    selected ? 'selected' : '',
  ].filter(Boolean);
  return `Tube ${index + 1} of ${total}: ${contents}. ${free} free ${free === 1 ? 'space' : 'spaces'}.${flags.length ? ` ${flags.join(', ')}.` : ''}`;
}

/** One announcement for the result of a move. */
export function describeEvents(events: GameEvent[], _state?: GameState): string {
  const parts: string[] = [];
  for (const e of events) {
    if (e.type === 'poured') parts.push(`Poured ${e.amount} ${name(e.color)} from tube ${e.from + 1} to tube ${e.to + 1}.`);
    else if (e.type === 'tubeCompleted') parts.push(`Tube ${e.tube + 1} complete.`);
    else if (e.type === 'revealed') parts.push(`Tube ${e.tube + 1}: a ${name(e.color)} layer is revealed.`);
    else if (e.type === 'thawed') parts.push(`Tube ${e.tube + 1} has thawed.`);
    else if (e.type === 'unlocked') parts.push(`Tube ${e.tube + 1} is unlocked.`);
    else if (e.type === 'catalystActivated') parts.push(`Catalyst in tube ${e.tube + 1} activated.`);
    else if (e.type === 'solved') parts.push('Experiment complete.');
  }
  return parts.join(' ');
}
