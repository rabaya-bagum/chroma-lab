import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../config/theme';
import { Icon } from './Icon';
import type { IconName } from './Icon';

interface Props {
  label: string;
  onPress(): void;
  icon?: IconName;
  disabled?: boolean;
  primary?: boolean;
  /** Overrides the spoken label (defaults to `label`). */
  accessibilityLabel?: string;
  /** Small line under the label, for example a coin price. */
  caption?: string;
}

export function GlowButton({ label, onPress, icon, disabled, primary, accessibilityLabel, caption }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.btn, primary && styles.primary, pressed && styles.pressed, disabled && styles.off]}
    >
      <View style={styles.inner}>
        {icon && <Icon name={icon} size={22} color={disabled ? theme.textDim : primary ? theme.accent : theme.text} />}
        <Text maxFontSizeMultiplier={1.3} style={[styles.text, primary && { color: theme.accent }]}>{label}</Text>
        {caption ? <Text maxFontSizeMultiplier={1.3} style={styles.caption}>{caption}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minWidth: 72, minHeight: 56, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
    borderWidth: 1, borderColor: theme.glassEdge, backgroundColor: 'rgba(18,27,51,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
  primary: { borderColor: theme.accent, shadowColor: theme.accent, shadowOpacity: 0.6, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
  pressed: { opacity: 0.75 },
  off: { opacity: 0.38 },
  inner: { alignItems: 'center', gap: 2 },
  text: { color: theme.text, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  caption: { color: '#FFC83D', fontSize: 10, fontWeight: '700' },
});
