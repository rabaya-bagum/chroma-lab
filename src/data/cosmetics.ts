export type CosmeticCategory = 'tube' | 'theme' | 'pour';

export type UnlockRule =
  | { type: 'default' }
  | { type: 'coins'; cost: number }
  | { type: 'stars'; stars: number }
  | { type: 'daily'; count: number };

export interface CosmeticItem {
  id: string;
  category: CosmeticCategory;
  name: string;
  description: string;
  unlock: UnlockRule;
}

/** The MVP collection (§12.5): three of each. Cosmetics never affect gameplay. */
export const COSMETICS: readonly CosmeticItem[] = [
  { id: 'tube.classic', category: 'tube', name: 'Classic Glass', description: 'Clear laboratory glass.', unlock: { type: 'default' } },
  { id: 'tube.neon', category: 'tube', name: 'Neon Glass', description: 'Glowing edges that hum with energy.', unlock: { type: 'coins', cost: 500 } },
  { id: 'tube.crystal', category: 'tube', name: 'Crystal', description: 'Faceted ice-blue crystal.', unlock: { type: 'stars', stars: 25 } },
  { id: 'theme.research', category: 'theme', name: 'Research Lab', description: 'A calm, cool research bench.', unlock: { type: 'default' } },
  { id: 'theme.space', category: 'theme', name: 'Space Lab', description: 'Experiments among the stars.', unlock: { type: 'coins', cost: 800 } },
  { id: 'theme.cyber', category: 'theme', name: 'Cyber Lab', description: 'A neon grid after dark.', unlock: { type: 'stars', stars: 40 } },
  { id: 'pour.classic', category: 'pour', name: 'Classic', description: 'A clean liquid stream.', unlock: { type: 'default' } },
  { id: 'pour.sparkle', category: 'pour', name: 'Sparkle', description: 'A glittering stream with a spark burst.', unlock: { type: 'coins', cost: 400 } },
  { id: 'pour.plasma', category: 'pour', name: 'Plasma', description: 'A crackling energy stream.', unlock: { type: 'daily', count: 5 } },
];

export const COSMETIC_BY_ID: Record<string, CosmeticItem> = Object.fromEntries(COSMETICS.map((c) => [c.id, c]));

export const DEFAULT_COSMETIC: Record<CosmeticCategory, string> = {
  tube: 'tube.classic',
  theme: 'theme.research',
  pour: 'pour.classic',
};

export const CATEGORY_LABEL: Record<CosmeticCategory, string> = { tube: 'TUBE SKINS', theme: 'LAB THEMES', pour: 'POUR EFFECTS' };
