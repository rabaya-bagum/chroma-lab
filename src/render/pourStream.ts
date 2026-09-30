import type { Plan } from './plan';
import { planProgress } from './plan';
import { poseAt } from './pourGeometry';

export interface StreamGeometry {
  visible: boolean;
  x0: number; y0: number;   // lip of the pouring tube (board coordinates)
  x1: number; y1: number;   // where the stream meets the destination liquid
  alpha: number;
  width: number;
}

/** Stream endpoints for time t, or an invisible stream. Worklet-safe. */
export function streamAt(pl: Plan, t: number, padBottom: number): StreamGeometry {
  'worklet';
  const none = { visible: false, x0: 0, y0: 0, x1: 0, y1: 0, alpha: 0, width: 0 };
  if (pl.kind !== 'pour') return none;
  const pose = poseAt(t, pl.tl, pl.target);
  if (pose.stream <= 0) return none;
  const pivotX = pl.src.x + pl.tubeW / 2 + pose.dx;
  const pivotY = pl.src.y + pose.dy;
  const c = Math.cos(pose.angle), s = Math.sin(pose.angle);
  const lipLocalX = pl.dir * (pl.tubeW / 2);
  const x0 = pivotX + lipLocalX * c;
  const y0 = pivotY + lipLocalX * s;
  const p = planProgress(pl, t);
  const level = (pl.dstStart + p * pl.amount) * pl.unitH;
  const y1 = pl.dst.y + pl.tubeH - padBottom - level;
  const x1 = pl.dst.x + pl.tubeW / 2;
  // quick fade-in at the start and fade-out at the end of the pour
  const span = pl.tl.pour;
  const u = (t - pl.tl.travel) / span;
  const alpha = Math.max(0, Math.min(1, u * 8, (1 - u) * 10));
  return { visible: y1 > y0, x0, y0, x1, y1, alpha, width: pl.tubeW * 0.13 };
}
