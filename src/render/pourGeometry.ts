/**
 * Pour choreography (§7.2). Pure functions that map a time `t` (ms) to the pose
 * of the pouring tube. They are plain arithmetic so they can also run as
 * Reanimated worklets on the UI thread.
 */

export interface PourTimeline {
  travel: number;   // move beside the destination and tilt
  pour: number;     // liquid transfers
  ret: number;      // return to the slot
  total: number;
}

export const MAX_POUR_MS = 650;

export function pourTimeline(amount: number): PourTimeline {
  'worklet';
  const travel = 160;
  const pour = Math.min(280, 100 + 45 * amount);
  const ret = 150;
  return { travel, pour, ret, total: travel + pour + ret };
}

export interface Pose {
  /** Translation of the tube's rest position. */
  dx: number;
  dy: number;
  /** Rotation in radians about the tube's top-centre (mouth). */
  angle: number;
  /** 0..1 liquid transfer progress. */
  p: number;
  /** 0..1 stream visibility. */
  stream: number;
}

export interface PourTarget {
  dx: number;
  dy: number;
  angle: number;
}

const easeOut = (x: number) => { 'worklet'; return 1 - (1 - x) * (1 - x) * (1 - x); };
const easeInOut = (x: number) => { 'worklet'; return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const clamp01 = (x: number) => { 'worklet'; return x < 0 ? 0 : x > 1 ? 1 : x; };

/**
 * Tilt angle (radians, magnitude) when the pour starts. A fuller tube reaches
 * its lip sooner so needs less tilt; an emptier one must tip further.
 */
export function tiltFor(fullness: number): number {
  'worklet';
  const f = clamp01(fullness);
  const deg = 78 - 38 * f; // 40 deg full .. 78 deg nearly empty
  return (deg * Math.PI) / 180;
}

/**
 * Where the tube must sit so that its lower lip is just above the destination
 * mouth. The tube rotates about its top-centre; `dir` is +1 when the
 * destination is to the right of the source.
 */
export function pourTarget(args: {
  srcX: number; srcY: number;         // source rest top-left
  dstX: number; dstY: number;         // destination rest top-left
  tubeW: number; tubeH: number;
  fullness: number; dir: 1 | -1;
}): PourTarget {
  'worklet';
  const { srcX, srcY, dstX, dstY, tubeW, tubeH, fullness, dir } = args;
  const angle = dir * tiltFor(fullness);
  // Lower lip in the tube's local frame relative to the pivot (top-centre).
  const lipX = dir * (tubeW / 2);
  const lipY = 0;
  const c = Math.cos(angle), s = Math.sin(angle);
  const lipWorldDx = lipX * c - lipY * s;
  const lipWorldDy = lipX * s + lipY * c;
  // Aim the lip at the destination mouth centre, a little above it.
  const aimX = dstX + tubeW / 2;
  const aimY = dstY - tubeH * 0.08;
  const pivotX = aimX - lipWorldDx;
  const pivotY = aimY - lipWorldDy - tubeH * 0.0;
  return { dx: pivotX - (srcX + tubeW / 2), dy: pivotY - srcY, angle };
}

/** Pose of the pouring tube at time `t` (ms since the animation started). */
export function poseAt(t: number, tl: PourTimeline, target: PourTarget): Pose {
  'worklet';
  if (t <= tl.travel) {
    const k = easeOut(clamp01(t / tl.travel));
    return { dx: target.dx * k, dy: target.dy * k, angle: target.angle * k, p: 0, stream: 0 };
  }
  if (t <= tl.travel + tl.pour) {
    const u = clamp01((t - tl.travel) / tl.pour);
    // tip a little further as the tube empties
    const extra = target.angle * 0.14 * u;
    return { dx: target.dx, dy: target.dy, angle: target.angle + extra, p: u, stream: 1 };
  }
  const u = easeInOut(clamp01((t - tl.travel - tl.pour) / tl.ret));
  const endAngle = target.angle * 1.14;
  return {
    dx: target.dx * (1 - u),
    dy: target.dy * (1 - u),
    angle: endAngle * (1 - u),
    p: 1,
    stream: 0,
  };
}

/**
 * Which side of the destination the source should pour from. The natural side
 * is the one the source is already on; if the tilted body would leave the
 * board there, use the other side (the tube passes over the destination).
 */
export function chooseSide(args: {
  srcX: number; srcY: number; dstX: number; dstY: number;
  tubeW: number; tubeH: number; fullness: number; boardW: number;
}): 1 | -1 {
  'worklet';
  const natural: 1 | -1 = args.dstX >= args.srcX ? 1 : -1;
  const margin = (dir: 1 | -1) => {
    const t = pourTarget({ ...args, dir });
    const pivotX = args.srcX + args.tubeW / 2 + t.dx;
    const reach = args.tubeH * Math.sin(Math.abs(t.angle) * 1.14) + args.tubeW / 2;
    return dir === 1 ? pivotX - reach : args.boardW - (pivotX + reach);
  };
  const other: 1 | -1 = natural === 1 ? -1 : 1;
  return margin(natural) >= 0 || margin(natural) >= margin(other) ? natural : other;
}
