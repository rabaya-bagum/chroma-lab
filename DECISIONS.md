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
