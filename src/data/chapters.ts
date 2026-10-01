export interface ChapterDef {
  id: number;
  name: string;
  /** Inclusive level numbers; undefined for chapters that are not built yet. */
  firstLevel?: number;
  lastLevel?: number;
  blurb: string;
}

export const CHAPTERS: readonly ChapterDef[] = [
  { id: 1, name: 'Basic Separation', firstLevel: 1, lastLevel: 10, blurb: 'Learn to sort the compounds.' },
  { id: 2, name: 'Pigment Research', firstLevel: 11, lastLevel: 25, blurb: 'More colours, tighter benches.' },
  { id: 3, name: 'Cryogenic Lab', firstLevel: 26, lastLevel: 35, blurb: 'Frozen liquid thaws on a condition.' },
  { id: 4, name: 'Unknown Compounds', firstLevel: 36, lastLevel: 45, blurb: 'Hidden layers show their colour when uncovered.' },
  { id: 5, name: 'Quantum Chemistry', firstLevel: 46, lastLevel: 55, blurb: 'Catalysts and locked tubes.' },
  { id: 6, name: 'Chromatic Synthesis', firstLevel: 56, lastLevel: 65, blurb: 'Pour one colour onto another to mix a new one.' },
  { id: 7, name: 'Full Spectrum', firstLevel: 66, lastLevel: 75, blurb: 'Mixing meets frost, mystery, locks and catalysts.' },
];

export const isChapterAvailable = (c: ChapterDef): boolean => c.firstLevel !== undefined;
