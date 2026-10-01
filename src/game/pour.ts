import { isConditionMet } from './conditions';
import { getMoveError, isTubeComplete, isPuzzleSolved, topRunLength } from './rules';
import type { CatalystEffect, GameEvent, GameState, Level, TubeDef, TubeState } from './types';

/**
 * Apply one pour and return the new state plus events in §5.5 order:
 * transfer, reveal, completion, catalyst, unlock/thaw, solved. An invalid move
 * returns the same state and no events.
 */
export function pourLiquid(
  level: Level,
  state: GameState,
  from: number,
  to: number,
): { state: GameState; events: GameEvent[] } {
  if (getMoveError(state, from, to) !== null) return { state, events: [] };

  const src = state.tubes[from];
  const dst = state.tubes[to];
  const amount = Math.min(topRunLength(src), dst.capacity - dst.liquids.length);
  const color = src.liquids[src.liquids.length - 1].color;

  const tubes: TubeState[] = state.tubes.slice();
  tubes[from] = { ...src, liquids: src.liquids.slice(0, src.liquids.length - amount) };
  tubes[to] = { ...dst, liquids: dst.liquids.concat(src.liquids.slice(src.liquids.length - amount)) };

  const events: GameEvent[] = [{ type: 'poured', from, to, color, amount }];
  const next = settle(level, { ...state, tubes, moves: state.moves + 1 }, events, to, color);
  return { state: next, events };
}

const defOf = (level: Level, tube: TubeState): TubeDef | undefined => level.tubes.find((d) => d.id === tube.id);

/**
 * Steps 2-6 of §5.5. A thaw or unlock can create a new completion, so the
 * steps repeat until nothing changes (bounded by the number of tubes). The
 * catalyst only reacts to the pour itself, so it is checked on the first pass.
 */
function settle(level: Level, state: GameState, events: GameEvent[], pourTo: number, pourColor: GameState['tubes'][number]['liquids'][number]['color']): GameState {
  const tubes = state.tubes.slice();
  const view = (): GameState => ({ ...state, tubes });
  const bound = tubes.length * 6 + 10;
  let first = true;

  for (let pass = 0; pass < bound; pass++) {
    let changed = false;

    // 2. reveal any hidden layer that is now on top
    tubes.forEach((t, i) => {
      const k = t.liquids.length - 1;
      if (k >= 0 && t.liquids[k].hidden) {
        tubes[i] = { ...t, liquids: t.liquids.map((l, j) => (j === k ? withoutHidden(l) : l)) };
        events.push({ type: 'revealed', tube: i, layerIndex: k, color: t.liquids[k].color });
        changed = true;
      }
    });

    // 3. mark and seal newly complete tubes (a locked tube cannot complete yet)
    tubes.forEach((t, i) => {
      if (!t.sealed && !t.locked && isTubeComplete(t)) {
        tubes[i] = { ...t, sealed: true };
        events.push({ type: 'tubeCompleted', tube: i, color: t.liquids[0].color });
        changed = true;
      }
    });

    // 4. catalyst: the trigger colour entered its tube for the first time
    if (first) {
      const t = tubes[pourTo];
      const cat = defOf(level, t)?.catalyst;
      if (cat && !t.catalystSpent && pourColor === cat.triggerColor) {
        tubes[pourTo] = { ...t, catalystSpent: true };
        events.push({ type: 'catalystActivated', tube: pourTo, effect: cat.effect });
        if (applyEffect(level, tubes, cat.effect, events)) changed = true;
        changed = true;
      }
    }

    // 5. conditions: unlock locked tubes, thaw frozen tubes
    tubes.forEach((t, i) => {
      const def = defOf(level, t);
      if (t.locked && def?.lock && isConditionMet(def.lock.unlockWhen, view())) {
        tubes[i] = { ...t, locked: false };
        events.push({ type: 'unlocked', tube: i });
        changed = true;
      }
      const cur = tubes[i];
      if (def?.thawWhen && cur.liquids.some((l) => l.frozen) && isConditionMet(def.thawWhen, view())) {
        tubes[i] = thaw(cur);
        events.push({ type: 'thawed', tube: i });
        changed = true;
      }
    });

    first = false;
    if (!changed) break;
  }

  const next = { ...state, tubes };
  if (isPuzzleSolved(next)) events.push({ type: 'solved' });
  return next;
}

function withoutHidden<L extends { hidden?: boolean }>(l: L): L {
  const { hidden: _h, ...rest } = l;
  return rest as L;
}

function thaw(t: TubeState): TubeState {
  return { ...t, liquids: t.liquids.map((l) => { const { frozen: _f, ...rest } = l; return rest; }) };
}

/** Apply a catalyst effect to its target tube. Returns true if anything changed. */
function applyEffect(level: Level, tubes: TubeState[], effect: CatalystEffect, events: GameEvent[]): boolean {
  const i = tubes.findIndex((t) => t.id === effect.tubeId);
  if (i < 0) return false;
  const t = tubes[i];
  switch (effect.type) {
    case 'unlockTube':
      if (!t.locked) return false;
      tubes[i] = { ...t, locked: false };
      events.push({ type: 'unlocked', tube: i });
      return true;
    case 'thawTube':
      if (!t.liquids.some((l) => l.frozen)) return false;
      tubes[i] = thaw(t);
      events.push({ type: 'thawed', tube: i });
      return true;
    case 'revealTube': {
      let any = false;
      const liquids = t.liquids.map((l, k) => {
        if (!l.hidden) return l;
        any = true;
        events.push({ type: 'revealed', tube: i, layerIndex: k, color: l.color });
        return withoutHidden(l);
      });
      if (any) tubes[i] = { ...t, liquids };
      return any;
    }
  }
}
