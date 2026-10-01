/* eslint-disable import/first -- jest.mock calls must run before the imports below */
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));
jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn(), setAudioModeAsync: jest.fn() }));

import * as H from 'expo-haptics';
import { createHaptics, HAPTIC_MIN_GAP_MS } from '../../src/services/haptics';
import { PlayerPool, pourRate, MAX_OVERLAP } from '../../src/services/audio';
import { effectivePatterns, effectiveReduceMotion } from '../../src/store/settingsStore';

describe('haptics', () => {
  const make = (enabled = true) => {
    let now = 1000;
    const timers: (() => void)[] = [];
    const h = createHaptics({ now: () => now, enabled: () => enabled, setTimeout: (fn) => { timers.push(fn); }, impl: H });
    return { h, advance: (ms: number) => { now += ms; }, timers };
  };
  beforeEach(() => jest.clearAllMocks());

  it('maps events to the right haptic', () => {
    const { h, advance } = make();
    h.trigger('select'); advance(100);
    h.trigger('pour'); advance(100);
    h.trigger('invalid'); advance(100);
    h.trigger('tubeComplete');
    expect(H.selectionAsync).toHaveBeenCalledTimes(1);
    expect(H.impactAsync).toHaveBeenCalledWith('medium');
    expect(H.notificationAsync).toHaveBeenNthCalledWith(1, 'warning');
    expect(H.notificationAsync).toHaveBeenNthCalledWith(2, 'success');
  });
  it('rate limits to one call per 60 ms', () => {
    const { h, advance } = make();
    h.trigger('select');
    advance(HAPTIC_MIN_GAP_MS - 1);
    h.trigger('pour');
    expect(H.impactAsync).not.toHaveBeenCalled();
    advance(1);
    h.trigger('pour');
    expect(H.impactAsync).toHaveBeenCalledTimes(1);
  });
  it('level complete: success, then heavy impact after 120 ms', () => {
    const setTimeoutSpy: { fn: () => void; ms: number }[] = [];
    let now = 0;
    const h = createHaptics({ now: () => now, enabled: () => true, setTimeout: (fn, ms) => { setTimeoutSpy.push({ fn, ms }); }, impl: H });
    h.trigger('levelComplete');
    expect(H.notificationAsync).toHaveBeenCalledWith('success');
    expect(setTimeoutSpy[0].ms).toBe(120);
    setTimeoutSpy[0].fn();
    expect(H.impactAsync).toHaveBeenCalledWith('heavy');
  });
  it('does nothing when disabled', () => {
    const { h } = make(false);
    h.trigger('select'); h.trigger('levelComplete');
    expect(H.selectionAsync).not.toHaveBeenCalled();
    expect(H.notificationAsync).not.toHaveBeenCalled();
  });
});

describe('audio helpers', () => {
  it('pool cycles through MAX_OVERLAP players', () => {
    const pool = new PlayerPool([1, 2, 3]);
    expect(MAX_OVERLAP).toBe(3);
    expect([pool.next(), pool.next(), pool.next(), pool.next()]).toEqual([1, 2, 3, 1]);
  });
  it('pour pitch stays in a narrow band', () => {
    expect(pourRate(0)).toBeGreaterThanOrEqual(0.9);
    expect(pourRate(0.999)).toBeLessThanOrEqual(1.1);
  });
});

describe('settings helpers', () => {
  it('reduce motion follows the OS unless overridden', () => {
    expect(effectiveReduceMotion({ reduceMotion: 'system', systemReduceMotion: true })).toBe(true);
    expect(effectiveReduceMotion({ reduceMotion: 'system', systemReduceMotion: false })).toBe(false);
    expect(effectiveReduceMotion({ reduceMotion: 'off', systemReduceMotion: true })).toBe(false);
    expect(effectiveReduceMotion({ reduceMotion: 'on', systemReduceMotion: false })).toBe(true);
  });
  it('colour-blind mode implies patterns', () => {
    expect(effectivePatterns({ colorBlind: true, patterns: false })).toBe(true);
    expect(effectivePatterns({ colorBlind: false, patterns: false })).toBe(false);
  });
});
