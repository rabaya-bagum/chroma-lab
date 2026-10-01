import React from 'react';
import { StyleSheet, View } from 'react-native';
import { features } from '../config/features';
import { GlowButton } from './GlowButton';

interface Props {
  canUndo: boolean;
  canAddTube: boolean;
  /** Coin price of the extra tube (0 = free). */
  tubeCost: number;
  coins: number;
  disabled: boolean;
  onUndo(): void;
  onRestart(): void;
  onAddTube(): void;
  onHint?(): void;
  /** Coin price of the next hint (0 = free). */
  hintCost?: number;
  hinting?: boolean;
}

export function GameControls(p: Props) {
  return (
    <View style={styles.row}>
      <GlowButton label="UNDO" icon="undo" onPress={p.onUndo} disabled={!p.canUndo || p.disabled} accessibilityLabel="Undo last move" />
      <GlowButton label="RESTART" icon="restart" onPress={p.onRestart} disabled={p.disabled} accessibilityLabel="Restart level" />
      {features.hints && p.onHint && (
        <GlowButton
          label={p.hinting ? '...' : 'HINT'} icon="hint" onPress={p.onHint}
          disabled={p.disabled || !!p.hinting || p.coins < (p.hintCost ?? 0)}
          caption={p.hintCost ? String(p.hintCost) : undefined}
          accessibilityLabel={p.hintCost ? `Hint for ${p.hintCost} coins` : 'Hint'}
        />
      )}
      <GlowButton
        label="+ TUBE" icon="tube" onPress={p.onAddTube}
        disabled={!p.canAddTube || p.disabled || p.coins < p.tubeCost}
        caption={p.tubeCost > 0 && p.canAddTube ? String(p.tubeCost) : undefined}
        accessibilityLabel={p.tubeCost > 0 ? `Add an extra tube for ${p.tubeCost} coins` : 'Add an extra tube'}
      />
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 8 } });
