import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { BlurMask, Canvas, Circle, Group, LinearGradient, Oval, Path, Rect, RoundedRect, vec } from '@shopify/react-native-skia';
import { Easing, useDerivedValue, useFrameCallback, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { theme as ui } from '../config/theme';
import { LAB_EQUIPMENT } from '../data/labEquipment';
import type { LabEquipment } from '../data/labEquipment';
import { useReduceMotion } from '../store/settingsStore';
import { pathFromD } from './svgPath';
import { ThemeBackdrop } from './ThemeBackdrop';
import { useCosmetics } from './useCosmetics';

const BOX = 100; // each item is drawn in a 100 x 100 box
const COLS = 2;

interface Look { main: string; accent: string; glass: string; glow: string; line: string }
const LIT: Look = { main: '#7F93BD', accent: '#27E3F2', glass: 'rgba(190,225,255,0.35)', glow: '#27E3F2', line: '#DCE8FF' };
const DARK: Look = { main: '#0E1730', accent: '#1B2A55', glass: 'rgba(60,80,130,0.15)', glow: '#1B2A55', line: '#2C3F72' };

const p = pathFromD;

/** Vector drawings of the lab equipment, written for this game. */
function Equipment({ id, look, phase, lit }: { id: string; look: Look; phase: SharedValue<number>; lit: boolean }) {
  const pulse = useDerivedValue(() => (lit ? 0.55 + 0.45 * Math.sin(phase.value * 2.2) : 0.15));
  const spin = useDerivedValue(() => [{ rotate: lit ? phase.value * 2.4 : 0 }]);
  const bob = useDerivedValue(() => [{ translateY: lit ? Math.sin(phase.value * 1.6) * 2.5 : 0 }]);
  const stroke = { style: 'stroke' as const, strokeWidth: 2.2, strokeCap: 'round' as const, strokeJoin: 'round' as const, color: look.line };

  switch (id) {
    case 'microscope':
      return (
        <>
          <RoundedRect x={22} y={86} width={56} height={8} r={3} color={look.main} />
          <Path path={p('M60 86 C80 80 80 40 58 28')} {...stroke} strokeWidth={5} color={look.main} />
          <Group transform={[{ translateX: 40 }, { translateY: 14 }, { rotate: -0.3 }]}>
            <RoundedRect x={0} y={0} width={14} height={44} r={4} color={look.main} />
            <Rect x={2} y={44} width={10} height={8} color={look.accent} />
          </Group>
          <Rect x={30} y={70} width={34} height={4} color={look.line} />
          <Circle cx={47} cy={64} r={3} color={look.glow} opacity={pulse} />
        </>
      );
    case 'centrifuge':
      return (
        <>
          <RoundedRect x={14} y={84} width={72} height={10} r={4} color={look.main} />
          <Circle cx={50} cy={54} r={34} color={look.glass} />
          <Circle cx={50} cy={54} r={34} {...stroke} />
          <Group transform={[{ translateX: 50 }, { translateY: 54 }]}>
            <Group transform={spin}>
              <Path path={p('M-26 0 H26 M0 -26 V26 M-18 -18 L18 18 M18 -18 L-18 18')} {...stroke} strokeWidth={3} color={look.accent} />
              {[[-26, 0], [26, 0], [0, -26], [0, 26]].map(([x, y]) => <Circle key={`${x},${y}`} cx={x} cy={y} r={5} color={look.glow} opacity={pulse} />)}
            </Group>
          </Group>
          <Circle cx={50} cy={54} r={6} color={look.line} />
        </>
      );
    case 'computer':
      return (
        <>
          <RoundedRect x={12} y={14} width={76} height={52} r={6} color={look.main} />
          <RoundedRect x={18} y={20} width={64} height={40} r={3} color={lit ? '#07122A' : look.accent} />
          <Path path={p('M22 52 L34 40 L44 46 L58 28 L78 36')} {...stroke} color={look.glow} opacity={pulse} />
          <Rect x={44} y={66} width={12} height={10} color={look.main} />
          <RoundedRect x={28} y={76} width={44} height={6} r={3} color={look.main} />
          <RoundedRect x={20} y={86} width={60} height={8} r={3} color={look.accent} />
        </>
      );
    case 'arm':
      return (
        <>
          <RoundedRect x={26} y={86} width={48} height={8} r={3} color={look.main} />
          <Path path={p('M50 86 V62 L72 40 L84 56')} {...stroke} strokeWidth={8} color={look.main} />
          <Circle cx={50} cy={62} r={7} color={look.accent} />
          <Circle cx={72} cy={40} r={6} color={look.accent} opacity={pulse} />
          <Path path={p('M84 56 L80 66 M84 56 L90 64')} {...stroke} strokeWidth={3} />
          <Circle cx={50} cy={62} r={3} color={look.glow} opacity={pulse} />
        </>
      );
    case 'quantum':
      return (
        <>
          <RoundedRect x={34} y={84} width={32} height={10} r={4} color={look.main} />
          <Rect x={46} y={66} width={8} height={18} color={look.main} />
          <Group transform={bob}>
            <Oval x={14} y={34} width={72} height={22} {...stroke} color={look.accent} />
            <Group transform={[{ translateX: 50 }, { translateY: 45 }, { rotate: 1.05 }, { translateX: -50 }, { translateY: -45 }]}>
              <Oval x={14} y={34} width={72} height={22} {...stroke} color={look.line} />
            </Group>
            <Circle cx={50} cy={45} r={9} color={look.glow} opacity={pulse}><BlurMask blur={5} style="normal" /></Circle>
            <Circle cx={50} cy={45} r={5} color={look.line} />
          </Group>
        </>
      );
    case 'reactor':
      return (
        <>
          <RoundedRect x={24} y={84} width={52} height={10} r={4} color={look.main} />
          <RoundedRect x={28} y={16} width={44} height={70} r={10} color={look.glass} />
          <RoundedRect x={28} y={16} width={44} height={70} r={10} {...stroke} />
          <RoundedRect x={38} y={28} width={24} height={46} r={8} opacity={pulse}>
            <LinearGradient start={vec(0, 28)} end={vec(0, 74)} colors={[look.glow, look.accent]} />
          </RoundedRect>
          <Rect x={24} y={12} width={52} height={8} color={look.main} />
          <Path path={p('M24 30 H12 V70 M76 30 H88 V70')} {...stroke} strokeWidth={3} color={look.accent} />
        </>
      );
    case 'hologram':
      return (
        <>
          <Oval x={20} y={78} width={60} height={14} color={look.main} />
          <Path path={p('M32 82 L18 30 H82 L68 82 Z')} color={look.glow} opacity={lit ? 0.14 : 0.05} />
          <Group transform={bob}>
            <Group transform={[{ translateX: 50 }, { translateY: 44 }]}>
              <Group transform={spin}>
                <Path path={p('M0 -20 L18 0 L0 20 L-18 0 Z')} {...stroke} color={look.glow} opacity={lit ? 1 : 0.5} />
                <Path path={p('M0 -20 V20 M-18 0 H18')} {...stroke} strokeWidth={1.2} color={look.line} opacity={pulse} />
              </Group>
            </Group>
          </Group>
        </>
      );
    default:
      return null;
  }
}

/** One slot: appears (scale and fade) when unlocked; locked slots stay as silhouettes. */
function Slot({ item, x, y, size, unlocked, index, phase, reduce }: {
  item: LabEquipment; x: number; y: number; size: number; unlocked: boolean; index: number; phase: SharedValue<number>; reduce: boolean;
}) {
  const appear = useSharedValue(reduce || !unlocked ? 1 : 0);
  useEffect(() => {
    if (reduce || !unlocked) { appear.value = 1; return; }
    appear.value = 0;
    appear.value = withDelay(180 + index * 160, withTiming(1, { duration: 520, easing: Easing.out(Easing.back(1.4)) }));
  }, [reduce, unlocked, index, appear]);
  const k = size / BOX;
  const transform = useDerivedValue(() => {
    const s = (0.55 + 0.45 * appear.value) * k;
    return [{ translateX: x + (size * (1 - s / k)) / 2 }, { translateY: y + (size * (1 - s / k)) / 2 }, { scale: s }];
  });
  const opacity = useDerivedValue(() => (unlocked ? appear.value : 0.9));
  return (
    <Group transform={transform} opacity={opacity}>
      <Equipment id={item.id} look={unlocked ? LIT : DARK} phase={phase} lit={unlocked} />
    </Group>
  );
}

interface Props { starsTotal: number }

/** The laboratory: equipment appears as stars are earned; locked pieces show as silhouettes with their threshold. */
export function LabScene({ starsTotal }: Props) {
  const reduce = useReduceMotion();
  const { theme } = useCosmetics();
  const [w, setW] = useState(0);
  const phase = useSharedValue(0);
  useFrameCallback((i) => { if (!reduce) phase.value += Math.min(0.05, (i.timeSincePreviousFrame ?? 16) / 1000); });

  const size = Math.min(150, (w - 48) / COLS);
  const rowH = size + 46;
  const rows = Math.ceil(LAB_EQUIPMENT.length / COLS);
  const height = rows * rowH + 24;

  const cells = useMemo(() => LAB_EQUIPMENT.map((item, i) => {
    const row = Math.floor(i / COLS);
    const inRow = row === rows - 1 && LAB_EQUIPMENT.length % COLS === 1 ? 1 : COLS;
    const col = i % COLS;
    const x = (w - inRow * size - (inRow - 1) * 20) / 2 + col * (size + 20);
    return { item, x, y: row * rowH + 14 };
  }), [w, size, rows, rowH]);

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  return (
    <View style={{ width: '100%', height }} onLayout={onLayout}>
      {w > 0 && (
        <>
          <Canvas style={StyleSheet.absoluteFill}>
            <ThemeBackdrop theme={theme} width={w} height={height} />
            {Array.from({ length: rows }, (_, r) => (
              <Rect key={r} x={12} y={r * rowH + 14 + size + 2} width={w - 24} height={3} color={theme.shelf} />
            ))}
            {cells.map(({ item, x, y }, i) => (
              <Slot key={item.id} item={item} x={x} y={y} size={size} unlocked={starsTotal >= item.stars} index={i} phase={phase} reduce={reduce} />
            ))}
          </Canvas>
          {cells.map(({ item, x, y }) => {
            const unlocked = starsTotal >= item.stars;
            return (
              <View key={item.id} style={[styles.label, { left: x - 10, top: y + size + 8, width: size + 20 }]} accessible
                accessibilityLabel={unlocked ? `${item.name}, unlocked` : `${item.name}, locked. Needs ${item.stars} stars${item.mvp ? '' : ', available in a future chapter'}`}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.name, !unlocked && { color: ui.textDim }]}>{unlocked ? item.name.toUpperCase() : `${item.stars} STARS`}</Text>
                {!unlocked && <Text maxFontSizeMultiplier={1.3} style={styles.sub}>{item.mvp ? item.name : 'Future chapters'}</Text>}
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { position: 'absolute', alignItems: 'center' },
  name: { color: ui.text, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, textAlign: 'center' },
  sub: { color: ui.textDim, fontSize: 10, textAlign: 'center' },
});
