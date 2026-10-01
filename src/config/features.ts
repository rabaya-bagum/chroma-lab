/** Feature flags: unfinished features stay hidden so every phase ships a clean build. */
export const features = {
  hints: true,          // Phase 4
  daily: true,          // Phase 4
  collection: true,     // Phase 4
  laboratory: true,     // Phase 4
  specialMechanics: true,  // Phase 5 (shipped; includes colour mixing)
} as const;
