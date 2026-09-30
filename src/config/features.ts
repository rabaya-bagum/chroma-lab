/** Feature flags: unfinished features stay hidden so every phase ships a clean build. */
export const features = {
  hints: false,          // Phase 4
  daily: false,          // Phase 4
  collection: false,     // Phase 4
  laboratory: false,     // Phase 4
  specialMechanics: false, // Phase 5
} as const;
