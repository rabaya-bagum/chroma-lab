/** Feature flags: unfinished features stay hidden so every phase ships a clean build. */
export const features = {
  hints: true,          // Phase 4
  daily: true,          // Phase 4
  collection: true,     // Phase 4
  laboratory: true,     // Phase 4
  specialMechanics: true,  // Phase 5 (shipped; includes colour mixing)
  /** Frame-rate overlay on the game board. Build with EXPO_PUBLIC_PERF_OVERLAY=1 (see eas.json "preview"). */
  perfOverlay: process.env.EXPO_PUBLIC_PERF_OVERLAY === '1',
} as const;
