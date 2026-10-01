/** Lab theme palettes (§12.5). Purely visual. */
export interface LabTheme {
  id: string;
  /** Solid colour used behind screens and as the canvas base. */
  bg: string;
  top: string;
  bottom: string;
  glow: string;
  glowOuter: string;
  shelf: string;
  bench: [string, string];
  silhouette: string;
  particle: string;
  decor: 'none' | 'stars' | 'grid';
}

export const THEMES: Record<string, LabTheme> = {
  'theme.research': {
    id: 'theme.research', bg: '#0A1020', top: '#0F1A36', bottom: '#080D1C',
    glow: 'rgba(39,227,242,0.10)', glowOuter: 'rgba(39,227,242,0)', shelf: 'rgba(150,190,255,0.35)',
    bench: ['#1A2547', '#0A1022'], silhouette: '#1A2A52', particle: 'rgba(190,230,255,0.45)', decor: 'none',
  },
  'theme.space': {
    id: 'theme.space', bg: '#06040F', top: '#0C0722', bottom: '#04030C',
    glow: 'rgba(155,92,255,0.22)', glowOuter: 'rgba(155,92,255,0)', shelf: 'rgba(190,160,255,0.4)',
    bench: ['#1B1340', '#07041A'], silhouette: '#241A55', particle: 'rgba(230,215,255,0.6)', decor: 'stars',
  },
  'theme.cyber': {
    id: 'theme.cyber', bg: '#030B10', top: '#06161D', bottom: '#030A0F',
    glow: 'rgba(255,79,184,0.16)', glowOuter: 'rgba(255,79,184,0)', shelf: 'rgba(39,227,242,0.55)',
    bench: ['#0B2630', '#030C12'], silhouette: '#0F3340', particle: 'rgba(80,255,240,0.5)', decor: 'grid',
  },
};

export const themeFor = (id: string): LabTheme => THEMES[id] ?? THEMES['theme.research'];
