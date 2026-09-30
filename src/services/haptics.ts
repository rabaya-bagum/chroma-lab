import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../store/settingsStore';

/** Minimum gap between haptic calls (§14). */
export const HAPTIC_MIN_GAP_MS = 60;

type Kind = 'select' | 'pour' | 'invalid' | 'tubeComplete' | 'levelComplete';

export interface HapticsDeps {
  now(): number;
  enabled(): boolean;
  setTimeout(fn: () => void, ms: number): void;
  impl: Pick<typeof Haptics, 'selectionAsync' | 'impactAsync' | 'notificationAsync'>;
}

export function createHaptics(deps: HapticsDeps) {
  let last = -Infinity;
  const guard = (): boolean => {
    if (!deps.enabled()) return false;
    const t = deps.now();
    if (t - last < HAPTIC_MIN_GAP_MS) return false;
    last = t;
    return true;
  };
  const swallow = (p: Promise<unknown> | undefined) => { p?.catch(() => undefined); };
  const { impl } = deps;

  return {
    trigger(kind: Kind): void {
      if (!guard()) return;
      switch (kind) {
        case 'select': swallow(impl.selectionAsync()); break;
        case 'pour': swallow(impl.impactAsync(Haptics.ImpactFeedbackStyle.Medium)); break;
        case 'invalid': swallow(impl.notificationAsync(Haptics.NotificationFeedbackType.Warning)); break;
        case 'tubeComplete': swallow(impl.notificationAsync(Haptics.NotificationFeedbackType.Success)); break;
        case 'levelComplete':
          swallow(impl.notificationAsync(Haptics.NotificationFeedbackType.Success));
          // Follow-up is part of the same effect, so it bypasses the rate limit.
          deps.setTimeout(() => { if (deps.enabled()) swallow(impl.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)); }, 120);
          break;
      }
    },
  };
}

export const haptics = createHaptics({
  now: () => Date.now(),
  enabled: () => useSettingsStore.getState().haptics,
  setTimeout: (fn, ms) => { setTimeout(fn, ms); },
  impl: Haptics,
});
