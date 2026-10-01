import type { SkPath } from '@shopify/react-native-skia';
import { Skia } from '@shopify/react-native-skia';

/** Glass styling for a tube skin (§12.5). Purely visual. */
export interface TubeSkin {
  id: string;
  edge: string;
  edgeW: number;
  /** Faint tint of the empty glass. */
  fill: string;
  highlight: string;
  reflection: string;
  rim: string;
  /** Constant outer glow (neon), in addition to the selection and completion glows. */
  glow?: { color: string; alpha: number };
  /** Draw crystal facets inside the glass. */
  facets: boolean;
  /** Seal cap gradient, top to bottom. */
  cap: [string, string, string];
}

export const SKINS: Record<string, TubeSkin> = {
  'tube.classic': {
    id: 'tube.classic',
    edge: 'rgba(190,215,255,0.8)', edgeW: 1.6,
    fill: 'rgba(150,190,255,0.07)',
    highlight: 'rgba(255,255,255,0.35)', reflection: 'rgba(255,255,255,0.18)',
    rim: 'rgba(220,235,255,0.7)',
    facets: false,
    cap: ['#E9F3FF', '#8FA6C9', '#55698C'],
  },
  'tube.neon': {
    id: 'tube.neon',
    edge: '#5CF2FF', edgeW: 2.2,
    fill: 'rgba(30,90,160,0.14)',
    highlight: 'rgba(160,255,255,0.5)', reflection: 'rgba(255,120,220,0.35)',
    rim: '#FF6FD0',
    glow: { color: '#27E3F2', alpha: 0.55 },
    facets: false,
    cap: ['#C9FDFF', '#27E3F2', '#0B6C78'],
  },
  'tube.crystal': {
    id: 'tube.crystal',
    edge: 'rgba(225,242,255,0.98)', edgeW: 2,
    fill: 'rgba(170,215,255,0.17)',
    highlight: 'rgba(255,255,255,0.6)', reflection: 'rgba(200,225,255,0.4)',
    rim: 'rgba(235,248,255,0.95)',
    facets: true,
    cap: ['#FFFFFF', '#BFD9FF', '#7AA0D6'],
  },
};

export const skinFor = (id: string): TubeSkin => SKINS[id] ?? SKINS['tube.classic'];

const facetCache = new Map<string, SkPath>();

/** Crystal facet lines for a tube of the given size (tube-local coordinates). */
export function facetPath(w: number, h: number): SkPath {
  const key = `${Math.round(w * 10)}x${Math.round(h * 10)}`;
  const hit = facetCache.get(key);
  if (hit) return hit;
  const p = Skia.PathBuilder.Make();
  const n = 5;
  for (let i = 0; i < n; i++) {
    const y = (h * (i + 0.6)) / (n + 0.4);
    p.moveTo(2, y + (i % 2 ? 10 : -6)); p.lineTo(w - 2, y + (i % 2 ? -8 : 12));
  }
  p.moveTo(w * 0.5, 2); p.lineTo(w * 0.5 + 1, h - 8);
  const built = p.build();
  facetCache.set(key, built);
  return built;
}
