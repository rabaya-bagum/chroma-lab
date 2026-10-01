import { create } from 'zustand';
import { DEFAULT_SETTINGS as SAVED_DEFAULTS } from '../game/save';
import type { SaveDataV1 } from '../game/save';

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

export const DEFAULT_SETTINGS: Settings = { ...SAVED_DEFAULTS, systemReduceMotion: false };

/** The persisted subset of the settings (everything except the OS flag). */
export type PersistedSettings = SaveDataV1['settings'];

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...DEFAULT_SETTINGS,
  set: (patch) => set(patch),
}));

export function persistedSettings(s: Settings): PersistedSettings {
  const { systemReduceMotion: _os, ...rest } = s;
  return rest;
}

export const effectiveReduceMotion = (s: Pick<Settings, 'reduceMotion' | 'systemReduceMotion'>): boolean =>
  s.reduceMotion === 'on' || (s.reduceMotion === 'system' && s.systemReduceMotion);

/** Colour-blind mode also turns patterns on (§13). */
export const effectivePatterns = (s: Pick<Settings, 'colorBlind' | 'patterns'>): boolean => s.colorBlind || s.patterns;

export const useReduceMotion = () => useSettingsStore(effectiveReduceMotion);
