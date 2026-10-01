import { poseAt } from './pourGeometry';
import type { PourTarget, PourTimeline } from './pourGeometry';
import type { LiquidColor } from '../game/types';

/**
 * One animated transfer of liquid. Built on the JS thread from an engine move
 * (or an undo diff) and read by every tube on the UI thread.
 *
 * Slot indices are absolute, so the picture is identical at p = 1 whether or
 * not the tubes' committed state has already been swapped in.
 */
export interface Plan {
  /** 'pour' moves and tilts the tube with a stream; 'slide' only changes levels (undo, reduced motion). */
  kind: 'pour' | 'slide';
  from: number;
  to: number;
  amount: number;
  srcKeep: number;    // first slot leaving the source
  dstStart: number;   // first slot arriving in the destination
  color: LiquidColor;
  hex: string;
  total: number;
  tl: PourTimeline;
  target: PourTarget;
  dir: 1 | -1;
  src: { x: number; y: number };
  dst: { x: number; y: number };
  tubeW: number;
  tubeH: number;
  unitH: number;
}

/** 0..1 liquid transfer progress at time t. */
export function planProgress(pl: Plan, t: number): number {
  'worklet';
  if (pl.kind === 'pour') return poseAt(t, pl.tl, pl.target).p;
  const x = t / pl.total;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Fill (0..1) of slot k of tube `index`, whose committed contents are `len` units. */
export function slotFillAt(pl: Plan | null, index: number, k: number, len: number, p: number): number {
  'worklet';
  let f = k < len ? 1 : 0;
  if (pl) {
    if (pl.from === index && k >= pl.srcKeep && k < pl.srcKeep + pl.amount) f = 1 - p;
    if (pl.to === index && k >= pl.dstStart && k < pl.dstStart + pl.amount) f = p;
  }
  return f;
}
