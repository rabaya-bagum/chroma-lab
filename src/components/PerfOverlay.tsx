import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { QUALITY_LITE } from '../render/quality';

export interface PerfStats { fps: number; worstMs: number; tier: number }

/** Developer overlay: frames per second over the last half second, worst frame, and the quality tier. */
export function PerfOverlay({ stats }: { stats: PerfStats }) {
  const bad = stats.fps < 45;
  return (
    <View style={[styles.box, { pointerEvents: 'none' }]} accessible={false} importantForAccessibility="no-hide-descendants">
      <Text style={[styles.text, bad && styles.bad]}>
        {stats.fps.toFixed(0)} fps  worst {stats.worstMs.toFixed(0)} ms  {stats.tier === QUALITY_LITE ? 'LITE' : 'FULL'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute', left: 6, top: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.6)' },
  text: { color: '#7CFFB0', fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  bad: { color: '#FF8A1F' },
});
