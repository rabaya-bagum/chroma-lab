# Decisions

Choices made where SPEC.md was silent or where reality forced a deviation.

## Phase 1

1. **Expo SDK 57** (`expo ~57.0.26`, React Native 0.86.3, React 19.2.3, TypeScript ~6.0). Versions are pinned via the lockfile and the `~` ranges in `package.json`. Phase 1 only installs what it uses (Zustand, Jest); Skia, Reanimated, audio, haptics, storage and navigation are added in the phases that need them.
2. **25 levels in total.** Level 1 is the handcrafted tutorial; levels 2-25 are generated (24 generated). The spec text says both "25 generated plus handcrafted level 1" and "25 levels, level 1 handcrafted"; the second reading is used.
3. **Out-of-range tube indices throw `RangeError`** in `getMoveError` and friends. They indicate a bug, not an illegal move, so they are not a `MoveError`.
4. **Deadlock ignores pointless moves.** `isDeadlocked` is "not solved and no *meaningful* move". A meaningful move is a valid move that is not the whole content of a tube poured into an empty tube (that only relabels a tube). Without this a board with a spare empty tube could never report a deadlock when only such moves remain. `getValidMoves` is unchanged and returns every valid move.
5. **Extra tube is added to every snapshot** (initial, history, current). Undo and restart therefore never remove a tube the player paid for, matching §8.2. The extra tube has id `X1`, capacity 4.
6. **`createSession` / `restartLevel` take `now` as a parameter** (default 0 / previous value) so the engine stays free of `Date.now()`. The store passes `Date.now()`.
7. **Solver heuristic is tighter than the spec's.** The spec suggests "colour boundaries between adjacent layers". The solver uses `h = (number of same-colour runs) - (complete tubes at the goal)`. One pour changes the run count by at most 1, and the goal has one run per complete tube, so it is admissible and consistent, and it dominates the boundary count. Exact solves of 7-colour levels take about 15 ms.
8. **Solver state key** sorts all tubes, because Phase 1 has no fixed-position tubes. Fixed positions for locked/catalyst/frozen/extra tubes arrive with Phase 5. The solver throws on locked, frozen or hidden input rather than giving a wrong answer.
9. **Pruning:** pointless relabel moves, sealed sources, and identical destination tubes are skipped. The "skip immediate reverse" rule is covered by the closed set (a state reached at equal or lower cost is never re-queued).
10. **Budget fallback.** If exact A* exceeds `maxNodes` (1.5M), weighted A* (weight 3, 400k nodes) looks for any solution and the result is flagged `exact: false`. Every shipped level was solved exactly.
11. **Level windows are below the spec's upper bounds.** Across thousands of exactly solved random deals with 2 empty tubes, the optimum tops out near 11 / 14 / 18 / 21 / 25 moves for 3 / 4 / 5 / 6 / 7 colours. Bands such as "20-34" for levels 21-25 cannot be reached by random dealing, so `difficulty.ts` ramps smaller windows per level inside what is reachable (levels 21-25: 20-26). Tune after playtesting. Difficulty grade is assigned by level number (easy 2-8, medium 9-15, hard 16-23, expert 24-25).
12. **Dead-end rate** (200 random playouts over meaningful moves) is recorded in a comment per level but is not used to accept or reject. With 2 empty tubes it is almost always near 0, so it does not discriminate yet.
13. **"Too trivial" check:** a deal with fewer than 3 meaningful initial moves is rejected.
14. **Duplicate detection** uses an exact canonical key: sorted tubes minimised over every colour permutation (`levelCanonicalKey`).
15. **Level data format:** levels are written as compact strings (`'GGRR'`, bottom to top, letters R B Y G V O C M) and expanded by `defineLevel`. Tube ids are `T1..Tn`.
16. **Generated levels are deterministic** from `g1:level-<n>`; the PRNG stream continues across rejected deals. `GENERATOR_VERSION` is `g1`.
17. **Tap flow lives in `game/interaction.ts`** (`resolveTap`) as pure code so it is unit tested; the store and later the Skia UI only execute the returned action.
18. **Phase 1 UI** is a plain level list plus a View-based game screen, with no navigation library, persistence or tutorial overlay (Phase 3). Tutorial steps are not shown yet; level 1 is authored so they will happen naturally.
19. **TypeScript 6 needs explicit `types`** (`jest`, `node`) in `tsconfig.json`.

## Phase 2

20. **Packages** (SDK 57 bundled versions, installed with `--legacy-peer-deps` because `expo install` could not reach its version API): `@shopify/react-native-skia 2.6.2`, `react-native-reanimated 4.5.1`, `react-native-worklets 0.10.1`, `expo-audio ~57.0.5`, `expo-haptics ~57.0.3`, `react-native-safe-area-context ~5.7.0`. Dev only: `react-native-web`, `react-dom` (browser QA), `@react-native/jest-preset` (peer of `jest-expo`).
21. **One Skia canvas for the whole board**, not one per tube. The pouring tube must draw above its neighbours, and a pour needs stream and particles across tubes. Tap targets and screen reader labels are separate `Pressable`s over the canvas (`components/Tube.tsx`). The canvas is 72 dp taller than the board and extends upward so a tilted tube is never clipped; it sits in a `pointerEvents="none"` wrapper.
22. **Animations are driven from engine events plus a committed-state swap.** The engine state updates immediately; `GameBoard` keeps a "shown" state, animates one `Plan` (a shared value) from `poured` events and a clock, then commits. Slot indices in a `Plan` are absolute, so the picture at p = 1 is identical before and after the commit (tested). Input is ignored while a pour runs (about 590 ms).
23. **Pour timeline:** 160 ms travel and tilt, `100 + 45 x amount` ms pour (max 280), 150 ms return. Longest case is 590 ms, under the 650 ms target.
24. **Tilt scales with fullness:** a fuller tube tilts 40 degrees, a nearly empty one up to 78 degrees, then tips 14% further as it drains. The source pours from the side of the destination it is on; if the tilted body would leave the board it passes over and pours from the other side (`chooseSide`).
25. **Liquid stays level in a tilted tube** by counter-rotating the liquid group about the surface. This is a visual approximation (surface height is not volume-conserving at extreme tilt).
26. **Undo is a quick level slide (240 ms)** between the two tubes involved, found by diffing the two states; it is not a reverse pour. Restart, add tube, and level change snap without animation.
27. **Reduce Motion:** follows the OS via `AccessibilityInfo` unless overridden. When on, pours become a 220 ms level change with no movement, tilt or stream; ambient waves, bubbles, sparks, shake, lift and the selection sweep are off.
28. **Particles:** one pooled array, at most 120 live, stepped on the UI thread. Sparks use a single pale-gold colour; per-colour sparks were not needed to look right.
29. **Colour-blind palette** is Okabe-Ito based (8 distinct values) and also turns patterns on. The base palette's violet was darkened (`#8447FF`) so violet and magenta differ by a luminance ratio above 1.5 (tested, as is blue/cyan).
30. **Settings** are a temporary toggle list on the level list screen, not persisted (Phase 3 adds the real screen and storage). The Hint button is hidden behind `features.hints`; `+ TUBE` is free in every level for now (coins arrive in Phase 3).
31. **Audio:** all sounds are silent 8 kHz WAV placeholders with their final names (`scripts/make-placeholder-sounds.ts`, `src/assets/sounds/README.md`). Up to 3 overlapping players per sound, pour pitch varied 0.94-1.06, music at 30% and ducked during the win sequence. Audio failures never reach gameplay.
32. **Win sequence** is about 2.2 s, skippable by tap: staggered tube glow, spark bursts, board brighten, win sound and haptics. The plain Phase 1 results panel now appears as an overlay at its end; the real overlay with coins is Phase 3.
33. **Web build for visual QA only.** Skia on web needs CanvasKit loaded first (`src/bootstrap.web.ts`) and `public/canvaskit.wasm` (`npm run web:setup`, not committed). `Skia.Path.MakeFromSVGString` fails on this web build, so `Icon` renders nothing there; native is unaffected. Colour labels need a system font and did not render in the web build, so they are unverified.
