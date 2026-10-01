# CHROMA LAB

A futuristic liquid-sorting puzzle game. See `SPEC.md` for the full product and technical specification and `DECISIONS.md` for choices made where it was silent.

**Stack:** Expo SDK 57 (`expo ~57.0.26`, React Native 0.86.3), TypeScript (strict), Expo Router, Zustand, AsyncStorage, Skia + Reanimated, `expo-audio`, `expo-haptics`, Jest (`jest-expo`).

## Commands

```bash
npm install
npm start               # Expo dev server (scan with Expo Go)
npm test                # engine, solver, generator and level tests
npm run typecheck
npm run lint
npm run levels:generate # regenerate src/data/levels.generated.ts (deterministic)
npm run levels:verify   # re-solve every shipped level; non-zero exit on any problem
npx tsx scripts/generate-daily-pool.ts   # regenerate the 60 fallback daily puzzles
npx tsx scripts/print-daily-solution.ts [YYYY-MM-DD]   # a date's daily solution, for QA
npx tsx scripts/print-level-solution.ts L047           # a level's solution and its events, for QA
npm run web:setup && npm run web   # browser build for visual QA only (needs CanvasKit wasm)
```

## Layout

- `src/game/` pure TypeScript rules engine, solver, generator, scoring. No React or Expo imports.
- `src/store/` thin Zustand stores that call the engine.
- `src/render/` Skia drawing (tube, liquid, glass, patterns, stream, particles) and pour geometry.
- `src/services/` audio and haptics (placeholder silent sounds in `src/assets/sounds/`).
- `src/app/` Expo Router routes (thin wrappers); `src/screens/`, `src/components/` UI.
- `src/data/` shipped levels (`levels.generated.ts` is generated; do not edit by hand).
- `scripts/` offline level generation and verification (run with `tsx`).

## Status

Phases 1 (engine, solver, levels), 2 (Skia rendering, animation, audio and haptics, accessibility), 3 (splash, home, level select, win overlay, coins and stars, persistence with resume, tutorial, settings, achievements) 4 (hints, Daily Experiment, Collection, Laboratory) and 5 (frozen liquid, mystery liquid, catalysts, locked tubes and reactor levels, with chapters 3-5) are complete. See `SPEC.md` section 17 for the remaining phases.
