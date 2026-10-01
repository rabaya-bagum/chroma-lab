import { Stack } from 'expo-router';
import * as ExpoSplash from 'expo-splash-screen';
import React, { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastHost } from '../components/Toast';
import { theme } from '../config/theme';
import { SplashScreen } from '../screens/SplashScreen';
import { audio } from '../services/audio';
import { initPersistence } from '../services/persistence';
import { useProgressStore } from '../store/progressStore';
import { useSettingsStore } from '../store/settingsStore';
import { useToastStore } from '../store/toastStore';

// Keep the native splash up for the first frame only; the JS splash takes over.
void ExpoSplash.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const hydrated = useProgressStore((s) => s.hydrated);
  const notice = useProgressStore((s) => s.notice);
  const [filled, setFilled] = useState(false);
  const onFilled = useCallback(() => setFilled(true), []);
  const hideNative = useCallback(() => { void ExpoSplash.hideAsync().catch(() => undefined); }, []);

  useEffect(() => {
    void initPersistence();
    void audio.init();
    const set = useSettingsStore.getState().set;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => set({ systemReduceMotion: v }));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => set({ systemReduceMotion: v }));
    const app = AppState.addEventListener('change', (st) => { if (st === 'active') audio.syncMusic(); });
    return () => { sub.remove(); app.remove(); };
  }, []);

  // keep the music setting in step with the store
  useEffect(() => useSettingsStore.subscribe((s, p) => { if (s.music !== p.music) audio.syncMusic(); }), []);

  useEffect(() => {
    if (hydrated && filled && notice) {
      useToastStore.getState().show({ kind: 'warn', title: 'SAVE RESET', message: notice });
      useProgressStore.getState().clearNotice();
    }
  }, [hydrated, filled, notice]);

  const ready = hydrated && filled;
  return (
    <SafeAreaProvider>
      {ready ? (
        <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: theme.bg } }}>
          <Stack.Screen name="game/[levelId]" options={{ gestureEnabled: false }} />
        </Stack>
      ) : (
        <SplashScreen onFilled={onFilled} onLayout={hideNative} />
      )}
      <ToastHost />
    </SafeAreaProvider>
  );
}
