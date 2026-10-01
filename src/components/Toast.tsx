import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../config/theme';
import { useToastStore } from '../store/toastStore';
import type { ToastItem } from '../store/toastStore';

const LIFETIME_MS = 3200;

function ToastView({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);
  useEffect(() => {
    const id = setTimeout(() => dismiss(item.id), LIFETIME_MS);
    return () => clearTimeout(id);
  }, [item.id, dismiss]);
  const color = item.kind === 'achievement' ? '#FFD84D' : item.kind === 'warn' ? theme.warn : theme.accent;
  return (
    <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOut.duration(180)} style={[styles.toast, { borderColor: color }]}
      accessibilityLiveRegion="polite" accessible accessibilityLabel={item.message ? `${item.title}. ${item.message}` : item.title}>
      <Text maxFontSizeMultiplier={1.3} style={[styles.title, { color }]}>{item.title}</Text>
      {item.message ? <Text maxFontSizeMultiplier={1.3} style={styles.msg}>{item.message}</Text> : null}
    </Animated.View>
  );
}

/** Renders queued toasts above everything; mount once in the root layout. */
export function ToastHost() {
  const queue = useToastStore((s) => s.queue);
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="none" style={[styles.host, { top: insets.top + 8 }]}>
      {queue.map((t) => <ToastView key={t.id} item={t} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 16, right: 16, gap: 8, zIndex: 1000, elevation: 1000 },
  toast: { backgroundColor: 'rgba(18,27,51,0.97)', borderWidth: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14 },
  title: { fontWeight: '800', letterSpacing: 1.5, fontSize: 13 },
  msg: { color: theme.text, marginTop: 2 },
});
