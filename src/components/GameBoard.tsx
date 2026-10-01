import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import {
  Canvas, Circle, Group, LinearGradient, matchFont, Path, Rect, Skia, vec,
} from '@shopify/react-native-skia';
import {
  cancelAnimation, Easing, useDerivedValue, useFrameCallback, useSharedValue, withSequence, withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { COLOR_NAMES, LIQUID_HEX, LIQUID_HEX_COLORBLIND } from '../config/theme';
import { describeEvents } from '../game/accessibility';
import { describeProgress } from '../game/conditions';
import { isMixPour, mixResult } from '../game/mixing';
import type { GameEvent, GameState, Level, LiquidColor } from '../game/types';
import { Particles } from '../render/ParticleLayer';
import { Stream } from '../render/Stream';
import { ThemeBackdrop } from '../render/ThemeBackdrop';
import { useCosmetics } from '../render/useCosmetics';
import { TubeCanvas } from '../render/TubeCanvas';
import type { BoardAnim } from '../render/TubeCanvas';
import { TUBE_PAD } from '../render/glassPaint';
import {
  createParticleState, emit, KIND_BUBBLE, KIND_SPARK, step,
} from '../render/particles';
import type { Plan } from '../render/plan';
import { chooseSide, pourTarget, pourTimeline } from '../render/pourGeometry';
import { useSettingsStore, effectivePatterns, effectiveReduceMotion } from '../store/settingsStore';
import { computeLayout } from '../utils/layout';
import type { BoardLayout } from '../utils/layout';
import { HintRings } from './HintRings';
import { TubeHit } from './Tube';

export interface BoardCallbacks {
  /** A pour animation is starting (play pour sound and haptic). */
  onPourStart?(events: GameEvent[]): void;
  onTubeComplete?(tube: number): void;
  /** All tubes finished; the win flourish has begun. */
  onSolved?(): void;
  onBusyChange?(busy: boolean): void;
  /** A section 11 mechanic just played out (reveal, thaw, unlock, catalyst). */
  onMechanic?(kind: 'reveal' | 'thaw' | 'unlock' | 'catalyst' | 'mix'): void;
}

interface Props extends BoardCallbacks {
  level: Level;
  current: GameState;
  events: GameEvent[];
  selected: number | null;
  shake: { tube: number; nonce: number } | null;
  onTap(tube: number): void;
  onBackgroundTap(): void;
  /** Tubes to ring (tutorial). */
  highlight?: number[];
}

/** The canvas extends this far above the board so a tilted tube is never clipped. */
const OVER = 72;
const UNDO_MS = 240;
/** Time for the catalyst arc to reach its target before the target's own animation starts. */
const CATALYST_ARC_MS = 380;
const REDUCED_MS = 220;

function findUndoMove(shown: GameState, target: GameState) {
  let from = -1, to = -1;
  shown.tubes.forEach((t, i) => {
    const d = t.liquids.length - target.tubes[i].liquids.length;
    if (d > 0) from = i;
    if (d < 0) to = i;
  });
  if (from < 0 || to < 0) return null;
  const amount = shown.tubes[from].liquids.length - target.tubes[from].liquids.length;
  return { from, to, amount };
}

/**
 * If the step from `shown` back to `target` undoes a mixing pour, the colours
 * of the drop that returns to `to` and of the unit that reappears under it.
 */
function mixUndo(shown: GameState, target: GameState, from: number, to: number) {
  if (!shown.mix) return null;
  const tf = target.tubes[from].liquids, tt = target.tubes[to].liquids;
  const sf = shown.tubes[from].liquids;
  if (tf.length === 0 || tt.length === 0 || sf.length !== tf.length + 1) return null;
  const under = tf[tf.length - 1].color, poured = tt[tt.length - 1].color;
  return mixResult(shown.mix, poured, under) === sf[sf.length - 1].color ? { poured, under } : null;
}

export function GameBoard(props: Props) {
  const { current, events, selected, shake, onTap, onBackgroundTap } = props;
  const settings = useSettingsStore();
  const reduce = effectiveReduceMotion(settings);
  const patterns = effectivePatterns(settings);
  const palette: Record<LiquidColor, string> = settings.colorBlind ? LIQUID_HEX_COLORBLIND : LIQUID_HEX;
  const { skin, theme: labTheme, effect } = useCosmetics();

  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  const [shown, setShown] = useState<GameState>(current);
  const shownRef = useRef(shown);
  useLayoutEffect(() => { shownRef.current = shown; }, [shown]);
  const [activeSrc, setActiveSrc] = useState(-1);
  const busy = useRef(false);
  /** Bumped by every play and snap; a finish from an older play is ignored. */
  const playGen = useRef(0);
  const [nonces, setNonces] = useState({ flourish: [] as number[], wobble: [] as number[] });
  const [fxDelay, setFxDelay] = useState<number[]>([]);

  const plan = useSharedValue<Plan | null>(null);
  const clock = useSharedValue(0);
  const phase = useSharedValue(0);
  const brighten = useSharedValue(0);
  const catT = useSharedValue(1);
  const catGeom = useSharedValue<number[]>([0, 0, 0, 0, 0]);
  const particles = useSharedValue<number[]>(createParticleState());
  const anim = useMemo<BoardAnim>(() => ({ plan, clock, phase }), [plan, clock, phase]);

  const layout: BoardLayout = useMemo(
    () => computeLayout(size.w, size.h, shown.tubes.length, shown.tubes[0]?.capacity ?? 4),
    [size.w, size.h, shown.tubes],
  );
  const layoutRef = useRef(layout);
  useLayoutEffect(() => { layoutRef.current = layout; }, [layout]);

  const font = useMemo(() => {
    try {
      return matchFont({
        fontFamily: Platform.select({ ios: 'Helvetica', default: 'sans-serif' }) as string,
        fontSize: Math.max(10, layout.unitH * 0.42),
        fontWeight: 'bold',
      });
    } catch { return null; }
  }, [layout.unitH]);

  const bump = useCallback((kind: 'flourish' | 'wobble', tube: number) => {
    setNonces((n) => {
      const arr = n[kind].slice();
      arr[tube] = (arr[tube] ?? 0) + 1;
      return { ...n, [kind]: arr };
    });
  }, []);

  const setBusy = useCallback((b: boolean) => {
    busy.current = b;
    props.onBusyChange?.(b);
  }, [props]);

  useFrameCallback((info) => {
    const dt = Math.min(0.05, (info.timeSincePreviousFrame ?? 16) / 1000);
    if (!reduce) phase.value += dt;
    if (particles.value[0] > 0) particles.modify((a) => { 'worklet'; step(a, dt); return a; });
  });

  const burst = useCallback((x: number, y: number, n: number, kind: number, spread = 1) => {
    if (reduce) return;
    particles.modify((a) => {
      'worklet';
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = (40 + Math.random() * 120) * spread;
        emit(a, kind === KIND_SPARK
          ? { x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 90, life: 0.5 + Math.random() * 0.5, size: 2.2, kind }
          : { x, y, vx: (Math.random() - 0.5) * 18, vy: -22 - Math.random() * 30, life: 0.7 + Math.random() * 0.6, size: 1.6 + Math.random() * 1.8, kind });
      }
      return a;
    });
  }, [particles, reduce]);

  // ambient bubbles rising inside random tubes
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => {
      if (busy.current) return;
      const l = layoutRef.current;
      const filled = shownRef.current.tubes.map((t, i) => (t.liquids.length > 0 ? i : -1)).filter((i) => i >= 0);
      if (filled.length === 0 || l.positions.length === 0) return;
      const i = filled[Math.floor(Math.random() * filled.length)];
      const pos = l.positions[i];
      if (!pos) return;
      const top = shownRef.current.tubes[i].liquids.length * l.unitH;
      burst(pos.x + l.tubeW * (0.3 + Math.random() * 0.4), pos.y + l.tubeH - TUBE_PAD - Math.random() * top * 0.5, 1, KIND_BUBBLE);
    }, 1500);
    return () => clearInterval(id);
  }, [reduce, burst]);

  const winSequence = useCallback((state: GameState) => {
    const l = layoutRef.current;
    let order = 0;
    state.tubes.forEach((t, i) => {
      if (t.sealed) {
        const at = order++ * 110;
        setTimeout(() => {
          bump('flourish', i);
          const pos = l.positions[i];
          if (pos) burst(pos.x + l.tubeW / 2, pos.y, 10, KIND_SPARK);
        }, at);
      }
    });
    brighten.value = withSequence(withTiming(1, { duration: 400 }), withTiming(0.35, { duration: 1200 }));
    props.onSolved?.();
  }, [bump, burst, brighten, props]);

  const playMechanics = useCallback((target: GameState, evts: GameEvent[]) => {
    const l = layoutRef.current;
    const cat = evts.find((e): e is Extract<GameEvent, { type: 'catalystActivated' }> => e.type === 'catalystActivated');
    const delays: number[] = [];
    let arcTarget = -1;
    if (cat) {
      arcTarget = target.tubes.findIndex((t) => t.id === cat.effect.tubeId);
      if (arcTarget >= 0 && !reduce) delays[arcTarget] = CATALYST_ARC_MS;
    }
    setFxDelay(delays);
    const kinds = new Set<'reveal' | 'thaw' | 'unlock' | 'catalyst' | 'mix'>();
    const sparks: { tube: number; at: number }[] = [];
    for (const e of evts) {
      if (e.type === 'revealed') { kinds.add('reveal'); sparks.push({ tube: e.tube, at: delays[e.tube] ?? 0 }); }
      else if (e.type === 'thawed') { kinds.add('thaw'); sparks.push({ tube: e.tube, at: delays[e.tube] ?? 0 }); }
      else if (e.type === 'unlocked') { kinds.add('unlock'); sparks.push({ tube: e.tube, at: delays[e.tube] ?? 0 }); }
      else if (e.type === 'catalystActivated') kinds.add('catalyst');
      else if (e.type === 'mixed') { kinds.add('mix'); sparks.push({ tube: e.to, at: 0 }); }
    }
    if (cat && !reduce) {
      const a = l.positions[cat.tube], b = arcTarget >= 0 ? l.positions[arcTarget] : null;
      if (a && b) {
        catGeom.value = [a.x + l.tubeW / 2, a.y + l.tubeH - TUBE_PAD, b.x + l.tubeW / 2, b.y + l.tubeH * 0.4, l.tubeW];
        catT.value = 0;
        catT.value = withTiming(1, { duration: CATALYST_ARC_MS + 220, easing: Easing.out(Easing.cubic) });
      }
    }
    for (const sp of sparks) {
      const pos = l.positions[sp.tube];
      if (pos) setTimeout(() => burst(pos.x + l.tubeW / 2, pos.y + l.tubeH * 0.45, 9, KIND_SPARK, 0.6), sp.at + 200);
    }
    kinds.forEach((k) => props.onMechanic?.(k));
  }, [burst, catGeom, catT, props, reduce]);

  const finish = useCallback((target: GameState, evts: GameEvent[], pourTo: number, pourFrom: number, gen: number) => {
    if (gen !== playGen.current) return; // superseded by a snap or a newer play
    playMechanics(target, evts);
    setShown(target);
    setActiveSrc(-1);
    setBusy(false);
    if (pourTo >= 0) {
      bump('wobble', pourTo); bump('wobble', pourFrom);
      if (effect === 'sparkle') {
        const l = layoutRef.current, pos = l.positions[pourTo];
        if (pos) burst(pos.x + l.tubeW / 2, pos.y + l.tubeH - TUBE_PAD - target.tubes[pourTo].liquids.length * l.unitH, 6, KIND_SPARK, 0.5);
      }
    }
    for (const e of evts) {
      if (e.type === 'tubeCompleted') {
        bump('flourish', e.tube);
        const l = layoutRef.current, pos = l.positions[e.tube];
        if (pos) burst(pos.x + l.tubeW / 2, pos.y, 8, KIND_SPARK, 0.7);
        props.onTubeComplete?.(e.tube);
      }
    }
    if (evts.some((e) => e.type === 'solved')) winSequence(target);
    AccessibilityInfo.announceForAccessibility(describeEvents(evts));
  }, [bump, burst, props, setBusy, winSequence, effect, playMechanics]);

  const play = useCallback((pl: Plan, target: GameState, evts: GameEvent[]) => {
    setBusy(true);
    const gen = ++playGen.current;
    if (pl.kind === 'pour') setActiveSrc(pl.from);
    plan.value = pl;
    clock.value = 0;
    clock.value = withTiming(pl.total, { duration: pl.total, easing: Easing.linear }, (fin) => {
      'worklet';
      if (fin) scheduleOnRN(finish, target, evts, pl.kind === 'pour' ? pl.to : -1, pl.from, gen);
    });
    if (pl.kind === 'pour' && !reduce) {
      const l = layoutRef.current, dst = l.positions[pl.to];
      for (let i = 0; i < Math.min(4, pl.amount * 2); i++) {
        setTimeout(() => dst && burst(dst.x + l.tubeW * 0.5, dst.y + l.tubeH - TUBE_PAD - (pl.dstStart + pl.amount) * l.unitH * 0.6, 1, KIND_BUBBLE), pl.tl.travel + i * 50);
      }
    }
  }, [burst, clock, finish, plan, reduce, setBusy]);

  // React to engine state changes.
  useEffect(() => {
    const S = shownRef.current;
    if (current === S) return;
    const l = layoutRef.current;
    const sameShape = S.levelId === current.levelId && S.tubes.length === current.tubes.length;

    if (busy.current) { // a restart or new level arrived mid-animation: snap
      playGen.current++; // a finish already on its way for the old play is dropped
      cancelAnimation(clock); // cancellation is asynchronous, hence the generation check in finish
      plan.value = null;
      setBusy(false);
      setActiveSrc(-1);
      setShown(current);
      return;
    }
    const poured = events[0]?.type === 'poured' ? (events[0] as Extract<GameEvent, { type: 'poured' }>) : null;
    if (sameShape && poured && current.moves === S.moves + 1) {
      const { from, to, amount, color } = poured;
      const src = l.positions[from], dst = l.positions[to];
      if (!src || !dst) { setShown(current); return; }
      const tl = pourTimeline(amount);
      const fullness = S.tubes[from].liquids.length / S.tubes[from].capacity;
      const dir = chooseSide({ srcX: src.x, srcY: src.y, dstX: dst.x, dstY: dst.y, tubeW: l.tubeW, tubeH: l.tubeH, fullness, boardW: l.width });
      const target = pourTarget({ srcX: src.x, srcY: src.y, dstX: dst.x, dstY: dst.y, tubeW: l.tubeW, tubeH: l.tubeH, fullness, dir });
      const slide = reduce;
      const pl: Plan = {
        kind: slide ? 'slide' : 'pour', from, to, amount,
        srcKeep: S.tubes[from].liquids.length - amount, dstStart: S.tubes[to].liquids.length,
        color, hex: palette[color], total: slide ? REDUCED_MS : tl.total, tl, target, dir,
        src, dst, tubeW: l.tubeW, tubeH: l.tubeH, unitH: l.unitH,
      };
      const mixed = events.find((e): e is Extract<GameEvent, { type: 'mixed' }> => e.type === 'mixed');
      if (mixed && S.tubes[to].liquids.length > 0) {
        // the arriving drop and the unit it lands on both blend into the new colour
        const under = S.tubes[to].liquids[S.tubes[to].liquids.length - 1].color;
        pl.arriveHex = palette[mixed.result];
        pl.arriveName = mixed.result;
        pl.fade = { tube: to, slot: pl.dstStart - 1, from: palette[under], to: palette[mixed.result], fromName: under, toName: mixed.result };
      }
      props.onPourStart?.(events);
      play(pl, current, events);
      return;
    }
    if (sameShape && current.moves === S.moves - 1) {
      const m = findUndoMove(S, current);
      const src = m && l.positions[m.from], dst = m && l.positions[m.to];
      if (m && src && dst) {
        const color = S.tubes[m.from].liquids[S.tubes[m.from].liquids.length - 1].color;
        const tl = pourTimeline(m.amount);
        const pl: Plan = {
          kind: 'slide', from: m.from, to: m.to, amount: m.amount,
          srcKeep: current.tubes[m.from].liquids.length, dstStart: S.tubes[m.to].liquids.length,
          color, hex: palette[color], total: reduce ? REDUCED_MS : UNDO_MS, tl,
          target: { dx: 0, dy: 0, angle: 0 }, dir: 1, src, dst, tubeW: l.tubeW, tubeH: l.tubeH, unitH: l.unitH,
        };
        const back = mixUndo(S, current, m.from, m.to);
        if (back) {
          // undoing a mix: the two result units split back into the drop and the unit it landed on
          pl.hex = palette[back.poured];
          pl.srcHex = palette[color];
          pl.srcName = color;
          pl.fade = { tube: m.from, slot: current.tubes[m.from].liquids.length - 1, from: palette[color], to: palette[back.under], fromName: color, toName: back.under };
        }
        play(pl, current, []);
        return;
      }
    }
    plan.value = null;
    setShown(current);
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  // once committed state is on screen the plan can be dropped
  useEffect(() => { if (!busy.current) plan.value = null; }, [shown, plan]);

  const brightenOpacity = useDerivedValue(() => brighten.value * 0.16);
  const order = useMemo(() => {
    const idx = shown.tubes.map((_, i) => i);
    return activeSrc >= 0 ? [...idx.filter((i) => i !== activeSrc), activeSrc] : idx;
  }, [shown.tubes, activeSrc]);

  const defs = props.level.tubes;
  const catalystColors = useMemo(
    () => shown.tubes.map((t) => { const c = defs.find((d) => d.id === t.id)?.catalyst; return c ? palette[c.triggerColor] : undefined; }),
    [shown.tubes, defs, palette],
  );
  const lockTexts = useMemo(
    () => shown.tubes.map((t) => {
      const lock = t.locked ? defs.find((d) => d.id === t.id)?.lock : undefined;
      return lock ? describeProgress(lock.unlockWhen, shown) : undefined;
    }),
    [shown, defs],
  );
  // a tube is selected: show what pouring it onto each other tube would mix
  const mixPreviews = useMemo(() => shown.tubes.map((t, i) => {
    if (selected === null || i === selected || !isMixPour(shown, selected, i)) return undefined;
    const a = shown.tubes[selected], b = t;
    const result = mixResult(shown.mix, a.liquids[a.liquids.length - 1].color, b.liquids[b.liquids.length - 1].color);
    return result ?? undefined;
  }), [shown, selected]);
  const arcPath = useDerivedValue(() => {
    const [x0, y0, x1, y1] = catGeom.value;
    const p = Skia.PathBuilder.Make();
    p.moveTo(x0, y0);
    p.quadTo((x0 + x1) / 2, Math.min(y0, y1) - 70, x1, y1);
    return p.build();
  });
  const ringR = useDerivedValue(() => catGeom.value[4] * (0.3 + 1.2 * catT.value));
  const ringOpacity = useDerivedValue(() => (catT.value >= 1 ? 0 : 1 - catT.value));
  const ringCx = useDerivedValue(() => catGeom.value[0]);
  const ringCy = useDerivedValue(() => catGeom.value[1]);
  const arcEnd = useDerivedValue(() => Math.min(1, catT.value * 1.6));
  const arcOpacity = useDerivedValue(() => (catT.value >= 1 ? 0 : 0.95));
  const shelfRows = useMemo(() => Array.from(new Set(layout.positions.map((p) => Math.round(p.y)))), [layout.positions]);
  const ready = size.w > 0 && size.h > 0;
  const hc = settings.highContrast;

  const handleTap = useCallback((i: number) => { if (!busy.current) onTap(i); }, [onTap]);

  return (
    <View style={styles.fill} onLayout={onLayout}>
      {ready && (
        <>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { if (!busy.current) onBackgroundTap(); }} accessible={false} />
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: -OVER, pointerEvents: 'none' }}>
          <Canvas style={StyleSheet.absoluteFill}>
            <Group transform={[{ translateY: OVER }]}>
            <ThemeBackdrop theme={labTheme} width={size.w} height={size.h} solid={hc} />
            {shelfRows.map((y) => (
              <Group key={y}>
                <Rect x={8} y={y + layout.tubeH + 2} width={size.w - 16} height={3} color={hc ? '#FFFFFF' : labTheme.shelf} />
                <Rect x={8} y={y + layout.tubeH + 5} width={size.w - 16} height={10}>
                  <LinearGradient start={vec(0, y + layout.tubeH + 5)} end={vec(0, y + layout.tubeH + 15)} colors={['rgba(150,190,255,0.12)', 'rgba(150,190,255,0)']} />
                </Rect>
              </Group>
            ))}
            {order.map((i) => {
              const pos = layout.positions[i];
              if (!pos) return null;
              return (
                <TubeCanvas
                  key={shown.tubes[i].id}
                  index={i}
                  tube={shown.tubes[i]}
                  x={pos.x} y={pos.y}
                  tubeW={layout.tubeW} tubeH={layout.tubeH} unitH={layout.unitH}
                  anim={anim} palette={palette} skin={skin}
                  patterns={patterns} labels={settings.labels} highContrast={hc} reduceMotion={reduce}
                  font={font}
                  selected={selected === i}
                  shakeNonce={shake && shake.tube === i ? shake.nonce : 0}
                  flourishNonce={nonces.flourish[i] ?? 0}
                  wobbleNonce={nonces.wobble[i] ?? 0}
                  catalystHex={catalystColors[i]}
                  fxDelay={fxDelay[i] ?? 0}
                />
              );
            })}
            <Stream anim={anim} reduceMotion={reduce} effect={effect} />
            {!reduce && (
              <Group>
                <Circle cx={ringCx} cy={ringCy} r={ringR} style="stroke" strokeWidth={3} color="#FFE9A8" opacity={ringOpacity} />
                <Path path={arcPath} style="stroke" strokeWidth={4} strokeCap="round" color="#FFE9A8" start={0} end={arcEnd} opacity={arcOpacity} />
              </Group>
            )}
            <Particles state={particles} />
            <Rect x={0} y={0} width={size.w} height={size.h} color="#FFFFFF" opacity={brightenOpacity} />
            </Group>
          </Canvas>
          </View>
          {shown.tubes.map((t, i) => (
            t.locked && lockTexts[i] && layout.positions[i] ? (
              <View key={`lock-${t.id}`} style={[styles.badge, { pointerEvents: 'none' }, { left: layout.positions[i].x - 14, width: layout.tubeW + 28, top: layout.positions[i].y + layout.tubeH * 0.42 + 16 }]}>
                <Text maxFontSizeMultiplier={1.3} style={styles.badgeText}>{lockTexts[i]}</Text>
              </View>
            ) : null
          ))}
          {mixPreviews.map((result, i) => (
            result && layout.positions[i] ? (
              <View key={`mix-${shown.tubes[i].id}`} style={[styles.mixBadge, { pointerEvents: 'none' }, { left: layout.positions[i].x - 14, width: layout.tubeW + 28, top: layout.positions[i].y - 22 }]}>
                <View style={[styles.mixDot, { backgroundColor: palette[result] }]} />
                <Text maxFontSizeMultiplier={1.3} style={styles.mixText}>{COLOR_NAMES[result].toUpperCase()}</Text>
              </View>
            ) : null
          ))}
          {props.highlight && props.highlight.length > 0 && <HintRings cells={layout.cells} tubes={props.highlight} />}
          {shown.tubes.map((t, i) => (
            layout.cells[i] ? (
              <TubeHit
                key={t.id} tube={t} index={i} total={shown.tubes.length} selected={selected === i}
                extra={t.locked ? lockTexts[i] : mixPreviews[i] ? `pouring here mixes ${COLOR_NAMES[mixPreviews[i]!].toLowerCase()}` : catalystColors[i] && !t.catalystSpent ? 'catalyst' : undefined}
                cell={layout.cells[i]} onPress={handleTap}
              />
            ) : null
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  badge: { position: 'absolute', alignItems: 'center' },
  mixBadge: { position: 'absolute', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  mixDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)' },
  mixText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textShadowColor: '#000', textShadowRadius: 4 },
  badgeText: { color: '#27E3F2', fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textAlign: 'center', textShadowColor: '#000', textShadowRadius: 4 },
});
