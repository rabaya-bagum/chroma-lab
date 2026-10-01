import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { describeTube } from '../game/accessibility';
import type { TubeState } from '../game/types';

interface Props {
  tube: TubeState;
  index: number;
  total: number;
  selected: boolean;
  /** Extra spoken detail, for example the lock counter. */
  extra?: string;
  cell: { x: number; y: number; w: number; h: number };
  onPress(index: number): void;
}

/**
 * Invisible tap target for one tube. The whole column (with padding, at least
 * 48x48 dp) is tappable and carries the screen reader label; the drawing itself
 * lives in the Skia canvas underneath.
 */
export const TubeHit = React.memo(function TubeHit({ tube, index, total, selected, extra, cell, onPress }: Props) {
  return (
    <Pressable
      onPress={() => onPress(index)}
      accessibilityRole="button"
      accessibilityLabel={describeTube(tube, index, total, selected, extra)}
      accessibilityState={{ selected, disabled: tube.locked }}
      style={[styles.hit, { left: cell.x, top: cell.y, width: cell.w, height: cell.h }]}
    />
  );
});

const styles = StyleSheet.create({ hit: { position: 'absolute' } });
