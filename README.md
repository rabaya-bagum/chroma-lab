# CHROMA LAB

A futuristic liquid-sorting puzzle game. See `SPEC.md` for the full product and technical specification and `DECISIONS.md` for choices made where it was silent.

**Stack:** Expo SDK 57 (`expo ~57.0.26`, React Native 0.86.3), TypeScript (strict), Zustand, Skia + Reanimated, `expo-audio`, `expo-haptics`, Jest (`jest-expo`).

## Commands

```bash
npm install
npm start               # Expo dev server (scan with Expo Go)
npm test                # engine, solver, generator and level tests
npm run typecheck
npm run levels:generate # regenerate src/data/levels.generated.ts (deterministic)
npm run levels:verify   # re-solve every shipped level; non-zero exit on any problem
npm run web:setup && npm run web   # browser build for visual QA only (needs CanvasKit wasm)
```

## Layout

- `src/game/` pure TypeScript rules engine, solver, generator, scoring. No React or Expo imports.
- `src/store/` thin Zustand stores that call the engine.
- `src/render/` Skia drawing (tube, liquid, glass, patterns, stream, particles) and pour geometry.
- `src/services/` audio and haptics (placeholder silent sounds in `src/assets/sounds/`).
- `src/screens/`, `src/components/` UI.
- `src/data/` shipped levels (`levels.generated.ts` is generated; do not edit by hand).
- `scripts/` offline level generation and verification (run with `tsx`).

## Status

Phases 1 (engine, solver, levels) and 2 (Skia rendering, animation, audio and haptics services, accessibility) are complete. See `SPEC.md` section 17 for the remaining phases.
