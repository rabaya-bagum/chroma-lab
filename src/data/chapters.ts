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
  { id: 3, name: 'Cryogenic Lab', blurb: 'Frozen liquid' },
  { id: 4, name: 'Unknown Compounds', blurb: 'Mystery liquid' },
  { id: 5, name: 'Quantum Chemistry', blurb: 'Catalysts and locked tubes' },
];

export const isChapterAvailable = (c: ChapterDef): boolean => c.firstLevel !== undefined;
