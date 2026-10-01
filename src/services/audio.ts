import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';

export type SoundName =
  | 'pour' | 'glassTap' | 'invalid' | 'tubeComplete' | 'button'
  | 'win' | 'unlock' | 'coin' | 'reveal' | 'thaw' | 'mix';

// Placeholder (silent) files with their final names; see src/assets/sounds/README.md.
const SOURCES: Record<SoundName, number> = {
  pour: require('../assets/sounds/pour.wav'),
  glassTap: require('../assets/sounds/glass_tap.wav'),
  invalid: require('../assets/sounds/invalid.wav'),
  tubeComplete: require('../assets/sounds/tube_complete.wav'),
  button: require('../assets/sounds/button.wav'),
  win: require('../assets/sounds/win.wav'),
  unlock: require('../assets/sounds/unlock.wav'),
  coin: require('../assets/sounds/coin.wav'),
  reveal: require('../assets/sounds/reveal.wav'),
  thaw: require('../assets/sounds/thaw.wav'),
  mix: require('../assets/sounds/mix.wav'),
};
const MUSIC_SOURCE: number = require('../assets/sounds/ambient_lab.wav');

export const MAX_OVERLAP = 3;
export const MUSIC_VOLUME = 0.3;
export const MUSIC_DUCKED_VOLUME = 0.08;

/** Round-robin over a fixed-size pool so up to MAX_OVERLAP instances can play at once. */
export class PlayerPool<T> {
  private i = 0;
  constructor(private readonly players: T[]) {}
  next(): T {
    const p = this.players[this.i];
    this.i = (this.i + 1) % this.players.length;
    return p;
  }
}

/** Slight pitch variation so repeated pours do not sound identical. Deterministic in `r` in [0,1). */
export const pourRate = (r: number): number => 0.94 + r * 0.12;

let pools: Partial<Record<SoundName, PlayerPool<AudioPlayer>>> = {};
let music: AudioPlayer | null = null;
let loaded = false;

/** Preload every sound at startup. Safe to call more than once. */
export async function initAudio(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    await setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' });
    for (const name of Object.keys(SOURCES) as SoundName[]) {
      pools[name] = new PlayerPool(Array.from({ length: MAX_OVERLAP }, () => createAudioPlayer(SOURCES[name])));
    }
    music = createAudioPlayer(MUSIC_SOURCE);
    music.loop = true;
    music.volume = MUSIC_VOLUME;
    syncMusic();
  } catch {
    // Audio is optional: never let it break gameplay.
  }
}

export function play(name: SoundName): void {
  if (!useSettingsStore.getState().sound) return;
  const player = pools[name]?.next();
  if (!player) return;
  try {
    if (name === 'pour') player.setPlaybackRate(pourRate(Math.random()));
    void player.seekTo(0);
    player.play();
  } catch {
    // ignore
  }
}

/**
 * Browsers refuse to start audio before the user has interacted with the page
 * (autoplay policy), and the refusal is an async rejection a try/catch cannot
 * catch. On web, music waits for the first pointer or key press.
 */
let webUnlocked = Platform.OS !== 'web';
let unlockListening = false;

function whenWebUnlocked(run: () => void): boolean {
  if (webUnlocked) return true;
  if (!unlockListening && typeof document !== 'undefined') {
    unlockListening = true;
    const unlock = () => {
      webUnlocked = true;
      document.removeEventListener('pointerdown', unlock, true);
      document.removeEventListener('keydown', unlock, true);
      run();
    };
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('keydown', unlock, true);
  }
  return false;
}

/** Start or stop the music loop to match the Music setting. */
export function syncMusic(): void {
  if (!music) return;
  if (!whenWebUnlocked(syncMusic)) return;
  try {
    if (useSettingsStore.getState().music) music.play();
    else music.pause();
  } catch {
    // ignore
  }
}

/** Duck the music (for the win sequence) and restore it afterwards. */
export function duckMusic(ducked: boolean): void {
  if (!music) return;
  try { music.volume = ducked ? MUSIC_DUCKED_VOLUME : MUSIC_VOLUME; } catch { /* ignore */ }
}

export const audio = { init: initAudio, play, syncMusic, duckMusic };
