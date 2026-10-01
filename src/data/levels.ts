import type { Level } from '../game/types';
import { GENERATED_LEVELS } from './levels.generated';
import { MECHANIC_LEVELS } from './levels.mechanics.generated';
import { MIXING_LEVELS } from './levels.mixing.generated';
import { HANDCRAFTED_LEVELS } from './levels.handcrafted';

/** All shipped levels in play order. */
export const LEVELS: Level[] = [...HANDCRAFTED_LEVELS, ...GENERATED_LEVELS, ...MECHANIC_LEVELS, ...MIXING_LEVELS].sort((a, b) => a.number - b.number);

export const getLevel = (id: string) => LEVELS.find((l) => l.id === id);
