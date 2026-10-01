import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../config/theme';
import { panelRules } from '../game/mechanicsText';
import type { Level } from '../game/types';

interface Props {
  level: Level;
  /** Start open (first play of a level with special rules). */
  initiallyOpen?: boolean;
}

/**
 * The level's special rules behind a small "RULES" button. Opening it shows the
 * rules in a card over the board, so the board keeps its full height; it closes
 * on a second tap. Nothing is rendered for classic levels.
 */
export function RulesPanel({ level, initiallyOpen = false }: Props) {
  const lines = panelRules(level);
  const [open, setOpen] = useState(initiallyOpen);
  if (lines.length === 0) return null;
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={open ? 'Hide level rules' : 'Show level rules'}
        style={styles.chip}
      >
        <Text maxFontSizeMultiplier={1.3} style={styles.chipText}>{open ? 'HIDE RULES' : `RULES (${lines.length})`}</Text>
      </Pressable>
      {open && (
        <View style={styles.card} accessibilityLiveRegion="polite" accessible accessibilityLabel={`Level rules. ${lines.join(' ')}`}>
          {lines.map((l) => <Text key={l} maxFontSizeMultiplier={1.3} style={styles.line}>{l}</Text>)}
          <Pressable onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Got it" style={styles.ok}>
            <Text style={styles.okText}>GOT IT</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', zIndex: 20, marginBottom: 2 },
  chip: { minHeight: 44, minWidth: 120, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  chipText: { color: theme.accent, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  card: {
    position: 'absolute', top: 44, left: 16, right: 16, gap: 6, padding: 14, borderRadius: 14,
    backgroundColor: 'rgba(18,27,51,0.97)', borderWidth: 1, borderColor: theme.accent, elevation: 8,
  },
  line: { color: theme.text, fontSize: 14, textAlign: 'center' },
  ok: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  okText: { color: theme.accent, fontWeight: '700', letterSpacing: 1.5 },
});
