import type { Level } from './types';

export interface ReactorMeter {
  limit: number;
  moves: number;
  /** 0..1 fill of the meter. */
  fill: number;
  /** Past the limit: the meter reads "Stabilised" and the bonus is lost. Play continues. */
  stabilised: boolean;
  bonusCoins: number;
}

/** Reactor meter state (§11.5). It fills per move, never per second; null for ordinary levels. */
export function reactorMeter(level: Level, moves: number): ReactorMeter | null {
  const r = level.rules?.reactor;
  if (!r) return null;
  return {
    limit: r.moveLimit,
    moves,
    fill: Math.min(1, moves / r.moveLimit),
    stabilised: moves > r.moveLimit,
    bonusCoins: r.bonusCoins,
  };
}

/** Bonus for solving a reactor level in `moves` (finishing exactly on the limit still counts). */
export function reactorBonus(level: Level, moves: number): number {
  const r = level.rules?.reactor;
  return r && moves <= r.moveLimit ? r.bonusCoins : 0;
}
