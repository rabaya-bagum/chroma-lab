import { useMemo } from 'react';
import { useProgressStore } from '../store/progressStore';
import { pourEffectOf } from './Stream';
import type { PourEffect } from './Stream';
import { skinFor } from './skins';
import type { TubeSkin } from './skins';
import { themeFor } from './themes';
import type { LabTheme } from './themes';

export interface Cosmetics { skin: TubeSkin; theme: LabTheme; effect: PourEffect }

/** The player's equipped tube skin, lab theme and pour effect. Cosmetics never affect gameplay. */
export function useCosmetics(): Cosmetics {
  const sel = useProgressStore((s) => s.save.cosmetics.selected);
  return useMemo(() => ({ skin: skinFor(sel.tube), theme: themeFor(sel.theme), effect: pourEffectOf(sel.pour) }), [sel.tube, sel.theme, sel.pour]);
}
