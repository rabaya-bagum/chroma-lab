import { create } from 'zustand';

export type ReduceMotionSetting = 'system' | 'on' | 'off';

export interface Settings {
  music: boolean;
  sound: boolean;
  haptics: boolean;
  colorBlind: boolean;
  patterns: boolean;
  labels: boolean;
  highContrast: boolean;
  reduceMotion: ReduceMotionSetting;
  /** OS-level reduce motion flag, mirrored from AccessibilityInfo. */
  systemReduceMotion: boolean;
}

interface SettingsStore extends Settings {
  set(patch: Partial<Settings>): void;
}

export const DEFAULT_SETTINGS: Settings = {
  music: true,
  sound: true,
  haptics: true,
  colorBlind: false,
  patterns: false,
  labels: false,
  highContrast: false,
  reduceMotion: 'system',
  systemReduceMotion: false,
};

// Persistence arrives in Phase 3 (§15).
export const useSettingsStore = create<SettingsStore>((set) => ({
  ...DEFAULT_SETTINGS,
  set: (patch) => set(patch),
}));

export const effectiveReduceMotion = (s: Pick<Settings, 'reduceMotion' | 'systemReduceMotion'>): boolean =>
  s.reduceMotion === 'on' || (s.reduceMotion === 'system' && s.systemReduceMotion);

/** Colour-blind mode also turns patterns on (§13). */
export const effectivePatterns = (s: Pick<Settings, 'colorBlind' | 'patterns'>): boolean => s.colorBlind || s.patterns;

export const useReduceMotion = () => useSettingsStore(effectiveReduceMotion);
