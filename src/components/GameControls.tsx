import React from 'react';
import { StyleSheet, View } from 'react-native';
import { features } from '../config/features';
import { GlowButton } from './GlowButton';

interface Props {
  canUndo: boolean;
  canAddTube: boolean;
  disabled: boolean;
  onUndo(): void;
  onRestart(): void;
  onAddTube(): void;
  onHint?(): void;
}

export function GameControls(p: Props) {
  return (
    <View style={styles.row}>
      <GlowButton label="UNDO" icon="undo" onPress={p.onUndo} disabled={!p.canUndo || p.disabled} accessibilityLabel="Undo last move" />
      <GlowButton label="RESTART" icon="restart" onPress={p.onRestart} disabled={p.disabled} accessibilityLabel="Restart level" />
      {features.hints && p.onHint && <GlowButton label="HINT" icon="hint" onPress={p.onHint} disabled={p.disabled} />}
      <GlowButton label="+ TUBE" icon="tube" onPress={p.onAddTube} disabled={!p.canAddTube || p.disabled} accessibilityLabel="Add an extra tube" />
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 8 } });
