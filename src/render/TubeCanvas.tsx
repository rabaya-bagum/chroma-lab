import React, { useEffect, useMemo, useRef } from 'react';
import {
  BlurMask, Circle, Group, LinearGradient, Path, Rect, RoundedRect, Skia, Text as SkText, vec,
} from '@shopify/react-native-skia';
import type { SkFont, SkPath } from '@shopify/react-native-skia';
import {
  Easing, useDerivedValue, useSharedValue, withDelay, withSequence, withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { COLOR_LETTERS } from '../game/levelCodec';
import type { LiquidColor, TubeState } from '../game/types';
import { GLASS_INSET, TUBE_PAD, tubePaths } from './glassPaint';
import { inkFor } from './liquidPaint';
import { PATTERN_FOR, isFilledPattern, patternPath } from './patterns';
import type { PatternKind } from './patterns';
import { planProgress, slotFillAt, slotLookAt } from './plan';
import type { Plan } from './plan';
import { poseAt } from './pourGeometry';
import { crackPath, questionPath, shacklePath } from './marks';
import { bitsOf, hasBit, mixHex } from './mix';
import { facetPath } from './skins';
import type { TubeSkin } from './skins';

/** Shared animation state owned by the board. */
export interface BoardAnim {
  plan: SharedValue<Plan | null>;
  /** ms since the current plan started. */
  clock: SharedValue<number>;
  /** Ambient seconds; frozen under Reduce Motion. */
  phase: SharedValue<number>;
}

export interface TubeCanvasProps {
  index: number;
  tube: TubeState;
  x: number;
  y: number;
  tubeW: number;
  tubeH: number;
  unitH: number;
  anim: BoardAnim;
  palette: Record<LiquidColor, string>;
  skin: TubeSkin;
  patterns: boolean;
  labels: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  font: SkFont | null;
  selected: boolean;
  shakeNonce: number;
  flourishNonce: number;
  wobbleNonce: number;
  /** Trigger colour of a catalyst tube (draws its energy core). */
  catalystHex?: string;
  /** Delay (ms) before reveal, thaw and unlock animations, so a catalyst arc can arrive first. */
  fxDelay?: number;
}

export const LIFT = 12;
const KINDS: PatternKind[] = ['circles', 'diagonal', 'dots', 'grid', 'diamonds', 'waves', 'lines', 'chevrons'];
const ACCENT = '#27E3F2';
const HIDDEN_HEX = '#151C36';
const FROST_HEX = '#CDE8FF';

interface SlotView {
  y: number; h: number; color: string; name: string; fill: number; hex: string;
  /** 0..1 how much the mystery veil covers this layer. */
  veil: number;
  /** 0..1 frost over this layer. */
  frost: number;
}

export const TubeCanvas = React.memo(function TubeCanvas(p: TubeCanvasProps) {
  const { index, tube, x, y, tubeW, tubeH, unitH, anim, palette, reduceMotion, skin } = p;
  const cap = tube.capacity;
  const len = tube.liquids.length;
  const innerW = tubeW - 2 * GLASS_INSET;
  const paths = useMemo(() => tubePaths(tubeW, tubeH), [tubeW, tubeH]);
  const facets = useMemo(() => (skin.facets ? facetPath(tubeW, tubeH) : null), [skin.facets, tubeW, tubeH]);
  const patternPaths = useMemo(() => {
    const out = {} as Record<PatternKind, SkPath>;
    for (const k of KINDS) out[k] = patternPath(k, innerW, unitH);
    return out;
  }, [innerW, unitH]);

  // Committed contents as plain arrays so the worklets capture simple values.
  const names = useMemo(() => tube.liquids.map((l) => l.color), [tube.liquids]);

  const sel = useSharedValue(0);
  const sweep = useSharedValue(1);
  const shakeX = useSharedValue(0);
  const flourish = useSharedValue(0);
  const wobble = useSharedValue(0);
  const capT = useSharedValue(tube.sealed ? 1 : 0);

  useEffect(() => {
    sel.value = withTiming(p.selected ? 1 : 0, { duration: reduceMotion ? 90 : 160, easing: Easing.out(Easing.cubic) });
    if (p.selected && !reduceMotion) {
      sweep.value = 0;
      sweep.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) });
      wobble.value = 0.6;
      wobble.value = withTiming(0, { duration: 600 });
    }
  }, [p.selected, reduceMotion, sel, sweep, wobble]);

  useEffect(() => {
    if (p.shakeNonce === 0 || reduceMotion) return;
    shakeX.value = withSequence(
      withTiming(-5, { duration: 40 }), withTiming(5, { duration: 80 }),
      withTiming(-3, { duration: 70 }), withTiming(0, { duration: 40 }),
    );
  }, [p.shakeNonce, reduceMotion, shakeX]);

  useEffect(() => {
    if (p.flourishNonce === 0) return;
    flourish.value = 0;
    flourish.value = withTiming(1, { duration: reduceMotion ? 350 : 800, easing: Easing.out(Easing.cubic) });
  }, [p.flourishNonce, reduceMotion, flourish]);

  useEffect(() => {
    if (p.wobbleNonce === 0 || reduceMotion) return;
    wobble.value = 1;
    wobble.value = withTiming(0, { duration: 800, easing: Easing.out(Easing.quad) });
  }, [p.wobbleNonce, reduceMotion, wobble]);

  useEffect(() => {
    capT.value = withTiming(tube.sealed ? 1 : 0, { duration: reduceMotion ? 120 : 260, easing: Easing.out(Easing.cubic) });
  }, [tube.sealed, reduceMotion, capT]);

  // --- mechanics: mystery veil, frost, lock ------------------------------------
  const fxDelay = reduceMotion ? 0 : p.fxDelay ?? 0;
  const hiddenBits = useMemo(() => bitsOf(tube.liquids, (l) => l.hidden), [tube.liquids]);
  const frozenBits = useMemo(() => bitsOf(tube.liquids, (l) => l.frozen), [tube.liquids]);
  const hideMask = useSharedValue(hiddenBits);
  const revealBits = useSharedValue(0);
  const revealT = useSharedValue(1);
  const frostMask = useSharedValue(frozenBits);
  const frostT = useSharedValue(frozenBits ? 1 : 0);
  const warm = useSharedValue(0);
  const lockT = useSharedValue(tube.locked ? 1 : 0);
  const prev = useRef({ hidden: hiddenBits, frozen: frozenBits, locked: tube.locked });

  useEffect(() => {
    const before = prev.current.hidden;
    prev.current.hidden = hiddenBits;
    const revealed = before & ~hiddenBits;
    if (revealed && !reduceMotion) {
      hideMask.value = before;           // keep the veil until the dissolve plays
      revealBits.value = revealed;
      revealT.value = 0;
      revealT.value = withDelay(fxDelay, withTiming(1, { duration: 520, easing: Easing.out(Easing.quad) }, (done) => {
        if (done) { hideMask.value = hiddenBits; revealBits.value = 0; }
      }));
    } else {
      hideMask.value = hiddenBits;
      revealBits.value = 0;
    }
  }, [hiddenBits, reduceMotion, fxDelay, hideMask, revealBits, revealT]);

  useEffect(() => {
    const before = prev.current.frozen;
    prev.current.frozen = frozenBits;
    if (before && !frozenBits && !reduceMotion) {
      frostMask.value = before;
      frostT.value = 1;
      frostT.value = withDelay(fxDelay, withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) }, (done) => {
        if (done) frostMask.value = 0;
      }));
      warm.value = withDelay(fxDelay, withSequence(withTiming(1, { duration: 280 }), withTiming(0, { duration: 700 })));
    } else {
      frostMask.value = frozenBits;
      frostT.value = frozenBits ? 1 : 0;
    }
  }, [frozenBits, reduceMotion, fxDelay, frostMask, frostT, warm]);

  useEffect(() => {
    const before = prev.current.locked;
    prev.current.locked = tube.locked;
    if (before && !tube.locked && !reduceMotion) lockT.value = withDelay(fxDelay, withTiming(0, { duration: 520, easing: Easing.out(Easing.quad) }));
    else lockT.value = tube.locked ? 1 : 0;
  }, [tube.locked, reduceMotion, fxDelay, lockT]);

  // --- pose of the whole tube -------------------------------------------------
  const pose = useDerivedValue(() => {
    const pl = anim.plan.value;
    if (pl && pl.kind === 'pour' && pl.from === index) {
      const s = poseAt(anim.clock.value, pl.tl, pl.target);
      return { dx: s.dx, dy: s.dy, angle: s.angle };
    }
    return { dx: 0, dy: 0, angle: 0 };
  });
  const transform = useDerivedValue(() => [
    { translateX: x + pose.value.dx + shakeX.value },
    { translateY: y + pose.value.dy - LIFT * sel.value },
    { translateX: tubeW / 2 },
    { rotate: pose.value.angle },
    { translateX: -tubeW / 2 },
  ]);

  // --- liquid -----------------------------------------------------------------
  const slots = useDerivedValue<SlotView[]>(() => {
    const pl = anim.plan.value;
    const prog = pl ? planProgress(pl, anim.clock.value) : 0;
    const out: SlotView[] = [];
    let used = 0;
    for (let k = 0; k < cap; k++) {
      const fill = slotFillAt(pl, index, k, len, prog);
      const look = slotLookAt(pl, index, k, prog, k < len ? names[k] : '', k < len ? palette[names[k]] : '');
      let name = look.name;
      let hex = look.hex;
      let veil = 0;
      if (k < len && hasBit(hideMask.value, k)) {
        if (hasBit(revealBits.value, k)) {
          // dissolve: the dark veil fades into the true colour
          veil = 1 - revealT.value;
          hex = mixHex(HIDDEN_HEX, hex, revealT.value);
          if (revealT.value < 0.5) name = '';
        } else {
          veil = 1;
          hex = HIDDEN_HEX;
          name = '';
        }
      }
      const frost = k < len && hasBit(frostMask.value, k) ? frostT.value : 0;
      const h = fill * unitH;
      out.push({ y: tubeH - TUBE_PAD - used - h, h, color: hex || '#000000', name, fill, hex, veil, frost });
      used += h;
    }
    return out;
  }, [names, cap, len, palette, unitH, tubeH, hideMask, revealBits, revealT, frostMask, frostT]);

  const surface = useDerivedValue(() => {
    const s = slots.value;
    let top = s[0].y + s[0].h; // bottom
    let color = '#000000';
    let total = 0;
    for (let k = 0; k < s.length; k++) {
      if (s[k].fill > 0.001) { top = s[k].y; color = s[k].color; total += s[k].h; }
    }
    return { y: top, color, total };
  });

  const levelTransform = useDerivedValue(() => {
    const a = pose.value.angle;
    const cx = tubeW / 2, cy = surface.value.y;
    return [{ translateX: cx }, { translateY: cy }, { rotate: -a }, { translateX: -cx }, { translateY: -cy }];
  });

  const wave = useDerivedValue(() => {
    const top = surface.value;
    const path = Skia.PathBuilder.Make();
    if (top.total <= 0.5) return path.build();
    const amp = reduceMotion ? 0 : 0.7 + 1.9 * wobble.value;
    const x0 = GLASS_INSET - 2, x1 = tubeW - GLASS_INSET + 2;
    const n = 10;
    path.moveTo(x0, top.y);
    for (let i = 0; i <= n; i++) {
      const xx = x0 + ((x1 - x0) * i) / n;
      path.lineTo(xx, top.y - amp * Math.sin(anim.phase.value * 2.4 + i * 0.7));
    }
    path.lineTo(x1, top.y + 3); path.lineTo(x0, top.y + 3); path.close();
    return path.build();
  });
  const waveLine = useDerivedValue(() => {
    const top = surface.value;
    const path = Skia.PathBuilder.Make();
    if (top.total <= 0.5) return path.build();
    const amp = reduceMotion ? 0 : 0.7 + 1.9 * wobble.value;
    const x0 = GLASS_INSET, x1 = tubeW - GLASS_INSET;
    const n = 10;
    for (let i = 0; i <= n; i++) {
      const xx = x0 + ((x1 - x0) * i) / n;
      const yy = top.y - amp * Math.sin(anim.phase.value * 2.4 + i * 0.7);
      if (i === 0) path.moveTo(xx, yy); else path.lineTo(xx, yy);
    }
    return path.build();
  });
  const surfaceColor = useDerivedValue(() => surface.value.color);
  const shadeTop = useDerivedValue(() => surface.value.y);
  const shadeHeight = 3 * tubeH;

  // --- glow, cap, sweep -------------------------------------------------------
  const selGlow = useDerivedValue(() => sel.value * 0.9);
  const flourishGlow = useDerivedValue(() => Math.sin(Math.PI * flourish.value));
  const flourishColor = tube.liquids[0] ? palette[tube.liquids[0].color] : ACCENT;
  const sweepX = useDerivedValue(() => -tubeW * 0.6 + sweep.value * tubeW * 1.6);
  const sweepAlpha = useDerivedValue(() => Math.sin(Math.PI * sweep.value) * 0.55);
  const capY = useDerivedValue(() => -10 * (1 - capT.value) - 7);
  const capTransform = useDerivedValue(() => [{ translateY: capY.value }]);
  const capShineX = useDerivedValue(() => -tubeW * 0.5 + flourish.value * tubeW * 1.6);
  const capShineAlpha = useDerivedValue(() => Math.sin(Math.PI * flourish.value) * 0.9);

  const warmGlow = useDerivedValue(() => warm.value * 0.9);
  const frostGlow = useDerivedValue(() => (frostMask.value ? frostT.value * 0.55 : 0));
  const lockOpacity = useDerivedValue(() => lockT.value);
  const lockTransform = useDerivedValue(() => [
    { translateX: tubeW / 2 }, { translateY: tubeH * 0.42 }, { scale: 1 + (1 - lockT.value) * 0.9 },
  ]);
  const lockDim = useDerivedValue(() => lockT.value * 0.45);
  const corePulse = useDerivedValue(() => (tube.catalystSpent ? 0.22 : 0.45 + 0.35 * Math.sin(anim.phase.value * 3)));
  const shackle = useMemo(() => shacklePath(Math.min(22, tubeW * 0.5)), [tubeW]);
  const edgeW = p.highContrast ? Math.max(2.8, skin.edgeW + 0.8) : skin.edgeW;
  const edgeColor = p.highContrast ? '#FFFFFF' : skin.edge;
  const sepColor = p.highContrast ? '#FFFFFF' : 'rgba(0,0,0,0.32)';
  const sepH = p.highContrast ? 2.4 : 1.2;
  const showMarks = p.patterns || p.labels;
  const indexes = useMemo(() => Array.from({ length: cap }, (_, i) => i), [cap]);

  return (
    <Group transform={transform}>
      {/* selection + completion glow sits behind the glass */}
      <Path path={paths.outline} style="stroke" strokeWidth={5} color={ACCENT} opacity={selGlow}>
        <BlurMask blur={8} style="normal" />
      </Path>
      <Path path={paths.outline} style="stroke" strokeWidth={6} color={flourishColor} opacity={flourishGlow}>
        <BlurMask blur={10} style="normal" />
      </Path>

      <Path path={paths.outline} style="stroke" strokeWidth={5} color="#8FD4FF" opacity={frostGlow}>
        <BlurMask blur={8} style="normal" />
      </Path>
      <Path path={paths.outline} style="stroke" strokeWidth={7} color="#FFB36B" opacity={warmGlow}>
        <BlurMask blur={10} style="normal" />
      </Path>
      {skin.glow && (
        <Path path={paths.outline} style="stroke" strokeWidth={4} color={skin.glow.color} opacity={skin.glow.alpha}>
          <BlurMask blur={6} style="normal" />
        </Path>
      )}

      <Path path={paths.body} color={skin.fill} />

      <Group clip={paths.body}>
        <Group transform={levelTransform}>
          {indexes.map((k) => (
            <Slot key={k} k={k} slots={slots} tubeW={tubeW} tubeH={tubeH} unitH={unitH} innerW={innerW}
              sepColor={sepColor} sepH={sepH} showMarks={showMarks} patterns={p.patterns} labels={p.labels}
              patternPaths={patternPaths} font={p.font} phase={anim.phase} />
          ))}
          <Path path={wave} color={surfaceColor} />
          <Path path={waveLine} style="stroke" strokeWidth={1.2} color="rgba(255,255,255,0.55)" />
          <Rect x={0} y={shadeTop} width={tubeW} height={shadeHeight}>
            <LinearGradient
              start={vec(GLASS_INSET, 0)} end={vec(tubeW - GLASS_INSET, 0)}
              colors={['rgba(255,255,255,0.34)', 'rgba(255,255,255,0.0)', 'rgba(0,0,0,0.0)', 'rgba(0,0,0,0.34)']}
              positions={[0, 0.3, 0.6, 1]}
            />
          </Rect>
        </Group>
        {p.catalystHex && (
          <Group>
            <Circle cx={tubeW / 2} cy={tubeH - TUBE_PAD - unitH * 0.35} r={tubeW * 0.3} color={p.catalystHex} opacity={corePulse}>
              <BlurMask blur={6} style="normal" />
            </Circle>
            <Circle cx={tubeW / 2} cy={tubeH - TUBE_PAD - unitH * 0.35} r={tubeW * 0.12} color="#FFFFFF" opacity={corePulse} />
          </Group>
        )}
        <Rect x={0} y={0} width={tubeW} height={tubeH} color="rgb(4,8,20)" opacity={lockDim} />
        {!reduceMotion && (
          <Group transform={[{ rotate: 0.35 }]} opacity={sweepAlpha}>
            <Rect x={sweepX} y={-tubeH * 0.3} width={tubeW * 0.25} height={tubeH * 1.6} color="rgba(255,255,255,0.8)" />
          </Group>
        )}
      </Group>

      <Path path={paths.outline} style="stroke" strokeWidth={edgeW} color={edgeColor} />
      {facets && <Path path={facets} style="stroke" strokeWidth={1} color="rgba(255,255,255,0.22)" />}
      <Path path={paths.highlight} color={skin.highlight} />
      <Path path={paths.reflection} color={skin.reflection} />
      <Path path={paths.rim} style="stroke" strokeWidth={1.2} color={skin.rim} />

      {/* padlock on a locked tube; it swells and fades when the tube unlocks */}
      <Group transform={lockTransform} opacity={lockOpacity}>
        <Circle cx={0} cy={4} r={11} color={ACCENT} opacity={0.35}><BlurMask blur={6} style="normal" /></Circle>
        <Path path={shackle} style="stroke" strokeWidth={2.4} strokeCap="round" color={ACCENT} />
        <RoundedRect x={-8} y={-2} width={16} height={13} r={3} color={ACCENT} />
        <Circle cx={0} cy={4.5} r={1.8} color="#06121F" />
      </Group>

      {/* seal cap */}
      <Group opacity={capT}>
        <Group transform={capTransform}>
          <RoundedRect x={-1} y={0} width={tubeW + 2} height={9} r={3.5}>
            <LinearGradient start={vec(0, 0)} end={vec(0, 9)} colors={skin.cap} />
          </RoundedRect>
          <Group clip={Skia.RRectXY(Skia.XYWHRect(-1, 0, tubeW + 2, 9), 3.5, 3.5)} opacity={capShineAlpha}>
            <Rect x={capShineX} y={0} width={tubeW * 0.3} height={9} color="rgba(255,255,255,0.95)" />
          </Group>
        </Group>
      </Group>
    </Group>
  );
});

interface SlotProps {
  k: number;
  slots: SharedValue<SlotView[]>;
  tubeW: number; tubeH: number; unitH: number; innerW: number;
  sepColor: string; sepH: number;
  showMarks: boolean; patterns: boolean; labels: boolean;
  patternPaths: Record<PatternKind, SkPath>;
  font: SkFont | null;
  phase: SharedValue<number>;
}

const Slot = React.memo(function Slot(p: SlotProps) {
  const { k, slots, tubeW, tubeH, unitH, innerW, patternPaths } = p;
  // The bottom slot reaches far below the tube so the levelled liquid always fills the glass.
  const extra = k === 0 ? 3 * tubeH : 0;
  const y = useDerivedValue(() => slots.value[k].y);
  const h = useDerivedValue(() => (slots.value[k].h > 0.001 ? slots.value[k].h + extra : 0));
  const color = useDerivedValue(() => slots.value[k].color);
  const sepOpacity = useDerivedValue(() => (k > 0 && slots.value[k].fill > 0.02 ? 1 : 0));
  const markOpacity = useDerivedValue(() => Math.pow(slots.value[k].fill, 4));
  const markTransform = useDerivedValue(() => [{ translateX: GLASS_INSET }, { translateY: slots.value[k].y }]);
  const pathDV = useDerivedValue<SkPath>(() => {
    const name = slots.value[k].name as LiquidColor | '';
    const kind = name ? PATTERN_FOR[name] : 'lines';
    return patternPaths[kind];
  });
  const filledDV = useDerivedValue(() => {
    const name = slots.value[k].name as LiquidColor | '';
    return name && isFilledPattern(PATTERN_FOR[name]) ? 1 : 0;
  });
  const ink = useDerivedValue(() => inkFor(slots.value[k].hex || '#000000'));
  const inkSoft = useDerivedValue(() => {
    const i = inkFor(slots.value[k].hex || '#000000');
    return i === '#FFFFFF' ? 'rgba(255,255,255,0.55)' : 'rgba(10,16,32,0.5)';
  });
  const label = useDerivedValue(() => {
    const name = slots.value[k].name as LiquidColor | '';
    return name ? COLOR_LETTERS[name] : '';
  });
  const clip = useMemo(() => Skia.XYWHRect(0, 0, innerW, unitH), [innerW, unitH]);
  const q = useMemo(() => questionPath(Math.min(unitH * 0.6, 22)), [unitH]);
  const cracks = useMemo(() => crackPath(innerW, unitH), [innerW, unitH]);
  const veilOpacity = useDerivedValue(() => slots.value[k].veil * (0.4 + 0.3 * Math.sin(p.phase.value * 2.2 + k)));
  const veilTransform = useDerivedValue(() => [{ translateX: GLASS_INSET + innerW / 2 }, { translateY: slots.value[k].y + unitH / 2 }]);
  const frostOpacity = useDerivedValue(() => slots.value[k].frost * 0.5);
  const crackOpacity = useDerivedValue(() => slots.value[k].frost * 0.85);
  const fillOpacity = useDerivedValue(() => (filledDV.value ? 1 : 0));
  const strokeOpacity = useDerivedValue(() => (filledDV.value ? 0 : 1));

  return (
    <>
      <Rect x={-tubeW} y={y} width={3 * tubeW} height={h} color={color} />
      <Rect x={-tubeW} y={y} width={3 * tubeW} height={p.sepH} color={p.sepColor} opacity={sepOpacity} />
      <Rect x={GLASS_INSET} y={y} width={innerW} height={h} color={FROST_HEX} opacity={frostOpacity} />
      <Group transform={markTransform} opacity={crackOpacity} clip={clip}>
        <Path path={cracks} style="stroke" strokeWidth={1.2} color="#FFFFFF" />
      </Group>
      <Group transform={veilTransform} opacity={veilOpacity}>
        <Path path={q} style="stroke" strokeWidth={2.2} strokeCap="round" color="#8FA6D6" />
      </Group>
      {p.showMarks && (
        <Group transform={markTransform} clip={clip} opacity={markOpacity}>
          {p.patterns && (
            <>
              <Path path={pathDV} style="stroke" strokeWidth={1.6} color={inkSoft} opacity={strokeOpacity} />
              <Path path={pathDV} style="fill" color={inkSoft} opacity={fillOpacity} />
            </>
          )}
          {p.labels && p.font && (
            <SkText x={innerW / 2 - 4} y={unitH / 2 + 5} text={label} font={p.font} color={ink} />
          )}
        </Group>
      )}
    </>
  );
});

