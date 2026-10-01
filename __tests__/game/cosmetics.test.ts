import { COSMETICS } from '../../src/data/cosmetics';
import { LAB_EQUIPMENT, earnedEquipment } from '../../src/data/labEquipment';
import { LEVELS } from '../../src/data/levels';
import { buyCosmetic, grantEarned, isOwned, selectCosmetic, unlockStatus } from '../../src/game/cosmetics';
import { completeLevel } from '../../src/game/progress';
import { defaultGameSave, defaultSave, recomputeDerived } from '../../src/game/save';
import type { GameSave } from '../../src/game/save';
import { parseSave } from '../../src/services/saveParser';

const item = (id: string) => COSMETICS.find((c) => c.id === id)!;
const withCoins = (coins: number): GameSave => ({ ...defaultGameSave(), economy: { coins } });
const withStars = (stars: number): GameSave => {
  let s = defaultGameSave();
  for (const l of LEVELS) {
    if (s.progress.starsTotal >= stars) break;
    s = completeLevel(s, l, { moves: l.optimalMoves, undosUsed: 0, hintsUsed: 0, extraTubeUsed: false }, LEVELS, 1).save;
  }
  return { ...s, economy: { coins: 0 } };
};

describe('collection data', () => {
  it('has three items in each of three categories with the spec unlocks', () => {
    for (const cat of ['tube', 'theme', 'pour'] as const) expect(COSMETICS.filter((c) => c.category === cat)).toHaveLength(3);
    expect(item('tube.neon').unlock).toEqual({ type: 'coins', cost: 500 });
    expect(item('tube.crystal').unlock).toEqual({ type: 'stars', stars: 25 });
    expect(item('theme.space').unlock).toEqual({ type: 'coins', cost: 800 });
    expect(item('theme.cyber').unlock).toEqual({ type: 'stars', stars: 40 });
    expect(item('pour.sparkle').unlock).toEqual({ type: 'coins', cost: 400 });
    expect(item('pour.plasma').unlock).toEqual({ type: 'daily', count: 5 });
  });
});

describe('buying and equipping', () => {
  it('a new save owns and equips the three defaults', () => {
    const s = defaultGameSave();
    expect(['tube.classic', 'theme.research', 'pour.classic'].every((id) => isOwned(s, id))).toBe(true);
    expect(s.cosmetics.selected).toEqual({ tube: 'tube.classic', theme: 'theme.research', pour: 'pour.classic' });
  });
  it('buying spends coins and grants ownership; too little coins fails without change', () => {
    expect(buyCosmetic(withCoins(499), 'tube.neon')).toBeNull();
    const s = buyCosmetic(withCoins(520), 'tube.neon')!;
    expect(s.economy.coins).toBe(20);
    expect(isOwned(s, 'tube.neon')).toBe(true);
    expect(buyCosmetic(s, 'tube.neon')).toBeNull(); // already owned
  });
  it('only coin items can be bought', () => {
    expect(buyCosmetic(withCoins(9999), 'tube.crystal')).toBeNull();
    expect(buyCosmetic(withCoins(9999), 'pour.plasma')).toBeNull();
    expect(buyCosmetic(withCoins(9999), 'nope')).toBeNull();
  });
  it('equipping requires ownership and only changes that category', () => {
    expect(selectCosmetic(defaultGameSave(), 'tube.neon')).toBeNull();
    const bought = buyCosmetic(withCoins(900), 'theme.space')!;
    const s = selectCosmetic(bought, 'theme.space')!;
    expect(s.cosmetics.selected).toEqual({ tube: 'tube.classic', theme: 'theme.space', pour: 'pour.classic' });
  });
});

describe('earned unlocks', () => {
  it('stars unlock Crystal at 25 and Cyber Lab at 40', () => {
    expect(isOwned(grantEarned(withStars(24)), 'tube.crystal')).toBe(false);
    const s25 = withStars(25);
    expect(isOwned(s25, 'tube.crystal')).toBe(true);
    expect(isOwned(s25, 'theme.cyber')).toBe(false);
    expect(isOwned(withStars(40), 'theme.cyber')).toBe(true);
  });
  it('five daily completions unlock Plasma', () => {
    const daily = (n: number) => ({ ...defaultGameSave(), daily: { history: Object.fromEntries(Array.from({ length: n }, (_, i) => [`2026-10-0${i + 1}`, { moves: 1, timeMs: 1 }])), streak: 1 } });
    expect(isOwned(recomputeDerived(daily(4), LEVELS), 'pour.plasma')).toBe(false);
    expect(isOwned(recomputeDerived(daily(5), LEVELS), 'pour.plasma')).toBe(true);
  });
  it('unlockStatus reports progress, price and equipped state', () => {
    const s = withStars(10);
    expect(unlockStatus(s, item('tube.crystal'))).toMatchObject({ owned: false, progress: { current: s.progress.starsTotal, target: 25, unit: 'stars' } });
    expect(unlockStatus(withCoins(600), item('tube.neon'))).toMatchObject({ canBuy: true, cost: 500 });
    expect(unlockStatus(withCoins(100), item('tube.neon'))).toMatchObject({ canBuy: false });
    expect(unlockStatus(s, item('tube.classic'))).toMatchObject({ owned: true, equipped: true });
  });
  it('an equipped item that is not owned is reset to the default on load', () => {
    const raw = JSON.parse(JSON.stringify(defaultSave()));
    raw.cosmetics.selected.tube = 'tube.neon';
    raw.cosmetics.owned = ['tube.classic'];
    expect(parseSave(raw, LEVELS)!.cosmetics.selected.tube).toBe('tube.classic');
  });
  it('unknown ids in the owned list are dropped', () => {
    const raw = JSON.parse(JSON.stringify(defaultSave()));
    raw.cosmetics.owned = ['tube.classic', 'tube.gold'];
    expect(parseSave(raw, LEVELS)!.cosmetics.owned).not.toContain('tube.gold');
  });
});

describe('laboratory', () => {
  it('equipment thresholds match the spec', () => {
    expect(LAB_EQUIPMENT.map((e) => [e.id, e.stars])).toEqual([
      ['microscope', 10], ['centrifuge', 25], ['computer', 45], ['arm', 65], ['quantum', 100], ['reactor', 140], ['hologram', 180],
    ]);
    const maxStars = LEVELS.length * 3;
    expect(LAB_EQUIPMENT.filter((e) => e.mvp).every((e) => e.stars <= maxStars)).toBe(true);
    expect(LAB_EQUIPMENT.filter((e) => !e.mvp)).toEqual([]);
  });
  it('earnedEquipment follows the star total', () => {
    expect(earnedEquipment(9)).toEqual([]);
    expect(earnedEquipment(10)).toEqual(['microscope']);
    expect(earnedEquipment(75)).toEqual(['microscope', 'centrifuge', 'computer', 'arm']);
  });
  it('labUnlocked is recomputed from stars, never trusted from storage', () => {
    const raw = JSON.parse(JSON.stringify(defaultSave()));
    raw.progress.labUnlocked = ['hologram'];
    expect(parseSave(raw, LEVELS)!.progress.labUnlocked).toEqual([]);
    expect(withStars(25).progress.labUnlocked).toEqual(['microscope', 'centrifuge']);
  });
});
