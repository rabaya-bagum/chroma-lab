import { COSMETICS, COSMETIC_BY_ID, DEFAULT_COSMETIC } from '../data/cosmetics';
import type { CosmeticItem } from '../data/cosmetics';
import type { GameSave } from './save';

export const isOwned = (save: Pick<GameSave, 'cosmetics'>, id: string): boolean => save.cosmetics.owned.includes(id);

export interface UnlockStatus {
  owned: boolean;
  equipped: boolean;
  /** Can be bought right now with coins. */
  canBuy: boolean;
  /** Coin price, if it is bought with coins. */
  cost?: number;
  /** Progress towards a stars/daily unlock. */
  progress?: { current: number; target: number; unit: 'stars' | 'daily completions' };
  /** Short requirement text for the UI. */
  requirement: string;
}

const dailyCount = (save: Pick<GameSave, 'daily'>) => Object.keys(save.daily.history).length;

export function unlockStatus(save: GameSave, item: CosmeticItem): UnlockStatus {
  const owned = isOwned(save, item.id);
  const equipped = save.cosmetics.selected[item.category] === item.id;
  const u = item.unlock;
  switch (u.type) {
    case 'default':
      return { owned, equipped, canBuy: false, requirement: 'Default' };
    case 'coins':
      return { owned, equipped, canBuy: !owned && save.economy.coins >= u.cost, cost: u.cost, requirement: `${u.cost} coins` };
    case 'stars':
      return { owned, equipped, canBuy: false, progress: { current: Math.min(save.progress.starsTotal, u.stars), target: u.stars, unit: 'stars' }, requirement: `${u.stars} stars` };
    case 'daily':
      return { owned, equipped, canBuy: false, progress: { current: Math.min(dailyCount(save), u.count), target: u.count, unit: 'daily completions' }, requirement: `${u.count} daily completions` };
  }
}

/** Buy a coin-priced item. Null if not buyable or too expensive; coins never go negative. */
export function buyCosmetic(save: GameSave, id: string): GameSave | null {
  const item = COSMETIC_BY_ID[id];
  if (!item || item.unlock.type !== 'coins' || isOwned(save, id)) return null;
  if (save.economy.coins < item.unlock.cost) return null;
  return {
    ...save,
    economy: { coins: save.economy.coins - item.unlock.cost },
    cosmetics: { ...save.cosmetics, owned: [...save.cosmetics.owned, id] },
  };
}

/** Equip an owned item. Null if it is not owned. */
export function selectCosmetic(save: GameSave, id: string): GameSave | null {
  const item = COSMETIC_BY_ID[id];
  if (!item || !isOwned(save, id)) return null;
  return { ...save, cosmetics: { ...save.cosmetics, selected: { ...save.cosmetics.selected, [item.category]: id } } };
}

/** Add every default and every stars/daily item whose requirement is met; fix an invalid selection. */
export function grantEarned(save: GameSave): GameSave {
  const owned = new Set(save.cosmetics.owned.filter((id) => COSMETIC_BY_ID[id]));
  for (const item of COSMETICS) {
    const u = item.unlock;
    if (u.type === 'default') owned.add(item.id);
    else if (u.type === 'stars' && save.progress.starsTotal >= u.stars) owned.add(item.id);
    else if (u.type === 'daily' && dailyCount(save) >= u.count) owned.add(item.id);
  }
  const selected = { ...save.cosmetics.selected };
  for (const cat of ['tube', 'theme', 'pour'] as const) {
    const item = COSMETIC_BY_ID[selected[cat]];
    if (!item || item.category !== cat || !owned.has(item.id)) selected[cat] = DEFAULT_COSMETIC[cat];
  }
  const ownedList = COSMETICS.map((c) => c.id).filter((id) => owned.has(id));
  return { ...save, cosmetics: { owned: ownedList, selected } };
}
