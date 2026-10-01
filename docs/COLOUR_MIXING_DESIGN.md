# Colour mixing: design proposal (SPEC.md section 11.6)

Status: **proposal, not implemented.** Standard levels never mix, and nothing in `src/` has changed.
The numbers below come from a throwaway prototype, `scripts/prototypes/mixing.ts`, which models the
candidate rules in a small standalone engine so they could be measured before touching the real one.

Section 11.6 asks five questions that must be answered before implementation. The answers are in
section 2; section 3 turns them into precise rules; sections 4 to 6 cover levels, interface and engine
work; section 7 is the evidence; section 8 lists what needs the product owner's decision.

## 1. Summary

- **Three pairs mix, like paint:** red + blue = violet, blue + yellow = green, red + yellow = orange.
  Cyan and magenta never mix. The three results are *inert*: they do not mix further.
- **A mix is one drop.** A mixing pour moves exactly **one unit** onto a tube whose top unit is the
  other colour. Those two units become **two units** of the mix colour. Volume is conserved, so
  capacity, fill level, sealing and unit totals all behave exactly as today.
- **The win condition does not change** (every tube empty or full of one colour). What changes is the
  level design: a mixing level is built so that its unit counts are *not* multiples of 4 until the
  right amount is mixed (for example 2 red + 2 blue can only be finished as 4 violet).
- **Mixing is only enabled where it is needed.** Levels list the exact pairs they use; no level
  offers a mix that it does not require. The data says optional mixing is a trap (section 7).
- **The solver needs one real change:** the cheap "runs minus goal runs" bound stops being admissible
  (it returned a non-optimal answer on about 5% of mixing deals). A safe bound is available and the
  cost is acceptable offline.

Recommended scope: one new chapter of 10 levels ("Chromatic Synthesis", levels 56 to 65) that
introduces one pair at a time and combines mixing with the existing mechanics late in the chapter.

## 2. The five questions

### 2.1 Which pairs mix?

**The three primary pairs of the red-blue-yellow wheel:**

| Pour | Onto | Result |
|---|---|---|
| red | blue (either way round) | violet |
| blue | yellow | green |
| red | yellow | orange |

Why this set:
- Players already know it. A mix of red and blue giving violet needs no explanation.
- It reuses three colours the game already has and already draws with distinct patterns
  (violet = diamonds, green = grid, orange = waves), so no new art, patterns or labels are needed.
- It leaves cyan and magenta as "pure" colours, which keeps most of a level readable.
- Three pairs is the smallest set that is still a puzzle: with one pair the answer is obvious,
  with all eight colours mixing in many ways the state space and the rules become hard to learn.

Alternatives rejected: an additive (red-green-blue) wheel, which breaks the paint intuition for
anyone who has mixed colours; and a larger table (for example blue + green = cyan), which makes
"what happens if I pour this onto that" something the player has to look up.

Each level enables only the pairs it uses (`rules.mixing.pairs`). The other combinations stay
ordinary colour mismatches.

### 2.2 How many units does a mix produce?

**One unit of A and one unit of B become two units of the mix colour.** The poured drop and the
top unit of the destination are replaced by two units of the result, in the destination's top two
positions. The destination gains one unit (as with any one-unit pour) and the source loses one.

Why volume-conserving:
- Total units never change, so the end state still has a whole number of full tubes
  (`total units / capacity`) and the sealing and capacity rules need no exceptions.
- It matches how liquid behaves, which is easy to animate and to explain.

Rejected: "1 + 1 = 1" (a mix destroys a unit). It breaks conservation, so a level's total would stop
being a multiple of 4 and win conditions would need a new definition.

**Why exactly one drop.** A mixing pour always transfers one unit even if the source has a longer run
of the same colour. A mix is therefore a deliberate, precise action rather than a side effect of a
big pour, and the rule has one case instead of several (the alternative has to define what happens
when the source run is longer or shorter than the destination run). If playtesting shows this feels
slow, the fallback is to mix run-for-run; the prototype is easy to adjust for that.

### 2.3 Can mixed colours mix further?

**No. Violet, green and orange are inert.** They stack on themselves like any colour and cannot be
poured onto, or accept, a mix.

Why: it keeps the set of reachable colours at six, keeps the rules to three table rows, and keeps
the search small. Tertiary mixing (for example violet + yellow = brown) would multiply both the
number of rules and the number of ways to ruin a level. It has not been measured here, so this
document does not recommend it for the first version; it can be revisited after the first chapter is
playtested.

### 2.4 What is the win condition when unit counts per colour are not multiples of 4?

**The win condition stays exactly as it is: every tube empty, or full of one colour.** There is no
new goal screen and no per-colour target.

What changes is how a level is *built*. Mixing conserves total units, and every non-empty tube in
the final position holds exactly 4 units of one colour. So a level is winnable if the per-colour
counts can be made multiples of 4 by mixing, and it *requires* mixing if they are not multiples of 4
to begin with.

Worked example, 2 red + 2 blue and no violet:
- Without mixing the player ends with a tube of 2 red and a tube of 2 blue: not complete, no win.
- Two mixing pours (one red drop onto blue, twice) turn 2 red + 2 blue into 4 violet: one full tube.

General rule for the generator (section 4): let `m` be the number of pours for each pair. Final
counts are `red = r - m(rb) - m(ry)`, `blue = b - m(rb) - m(by)`, `yellow = y - m(by) - m(ry)`,
`violet = v + 2 m(rb)`, `green = g + 2 m(by)`, `orange = o + 2 m(ry)`, and a level is accepted only if
the initial counts are not all multiples of 4 and some choice of `m` makes all of them multiples of 4.
The solver then proves it is solvable.

### 2.5 How does the solver model mixing?

Three changes (details in section 6):

1. **Transitions come from the engine.** The mechanics search already runs on real game states using
   the engine's own pour function. Once the engine knows about mixing, the search models it with no
   separate copy of the rule. Classic levels keep the faster string solver.
2. **The cheap heuristic must change.** Today's bound ("each pour removes at most one colour run")
   is false for mixing: a mix pour can remove two runs at once (it removes the source's run and the
   mix layer merges into an existing run of the same mix colour). The prototype shows the old bound
   returns a non-optimal length in about 5% of mixing deals, which would give wrong `optimalMoves`
   and wrong stars. The safe replacement is `max(ceil(d/2), d - maxMixPours)`, where `d` is runs
   minus goal runs and `maxMixPours` is bounded by the primary units left (each mix consumes two
   different primaries).
3. **Duplicate detection must stop treating colours as interchangeable.** The generator's
   canonical key tries every colour relabelling; with a recipe table, only relabellings that preserve
   the recipes (swapping two inert pure colours, for example) are equivalent.

## 3. Rules

A pour from tube `A` to tube `B` is a **mixing pour** when all of these hold:

1. The level enables the pair `{top(A), top(B)}` and the colours differ.
2. `A` is a legal source (not empty, locked, sealed, or frozen on top) and `B` is not locked, not
   full, and not frozen on top.
3. Both top layers are visible (a hidden layer is never on top, as before).

Effect:
- `A` loses its top unit, exactly one unit, even if its top run is longer.
- `B` loses its top unit and gains two units of the result. `B`'s length goes up by one, which is why
  it must not be full.
- It counts as one move.
- Pouring the same colours the other way round gives the same result (violet for red onto blue and
  for blue onto red).

Everything else follows the classic and section 11 rules:
- Settle runs as in section 5.5. The new mix layers can complete the tube (`tubeCompleted`) and can
  satisfy conditions (for example `colorCompleted: violet`).
- **Hidden layers:** if the destination's top unit was the only unit above a hidden layer, that layer
  stays hidden (it is under the mix, not on top). The source reveals as usual.
- **Frozen layers:** a frozen top blocks mixing in either direction, like any pour.
- **Catalysts:** a catalyst fires if either the poured colour or the produced colour is its trigger
  colour (so a violet catalyst can be triggered by mixing).
- **Mix colours are inert:** violet, green and orange never mix again. A mismatch involving them is
  an ordinary invalid move.
- **Undo** is unchanged: it restores the previous snapshot, so a mix is undone like any other move.

New engine surface: a `mixing` rule on the level (`rules.mixing.pairs`), a `mixed` event
(`{ from, to, poured, with, result }`), and the rule available to `getMoveError`/`pourLiquid`
(simplest is to copy the pair list into `GameState` when a session starts, so `rules.ts` stays
level-free).

## 4. Levels

**Policy: a level that offers mixing must need it.** Generated and handcrafted mixing levels satisfy
the composition rule in 2.4, and the generator also proves the level is *unsolvable with mixing
disabled* so a player can never win by ignoring the mechanic.

Why not allow optional mixing: in the prototype, a level where every colour count is already a
multiple of 4 but mixing is possible ended stuck in **39%** of random plays, and every one of those
had mixed along the way. Mixing there is only a way to lose by accident.

Proposed chapter 6, "Chromatic Synthesis" (levels 56 to 65, difficulty hard to expert):

| Levels | Content |
|---|---|
| 56-58 | One pair (red + blue), 2 or 3 mix pours, 4-5 colours |
| 59-61 | Two pairs, 2-4 mix pours |
| 62-63 | Three pairs |
| 64-65 | Mixing combined with one earlier mechanic (hidden layers, then a locked tube) |

One reactor level is allowed (it respects the one-per-ten rule). Mixing levels also get a
tutorial overlay (section 5), driven by a new `tutorial: 'mixing'` marker like level 1's.

Prototype difficulty (exact solves of 60 random deals per recipe, 2 empty tubes, 4 units per tube):

| Recipe (letters = units) | Optimal moves | Mix pours in best line | Search nodes (median) |
|---|---|---|---|
| R2 B2 + 2 pure colours | 8-11 | 2 | 59 |
| R2 B2 + 3 pure colours | 10-15 | 2 | 128 |
| R2 B4 Y2 + 1 pure (two pairs) | 7-11 | 2-4 | 142 |
| R3 B3 V2 + 2 pure (three mixes) | 11-15 | 3 | 376 |
| R2 Y4 B2 O4 + 1 pure (two groups) | 9-14 | 2-4 | 337 |

(Node counts are for the optimistic heuristic; section 7 has the safe-bound cost.) Optimal lengths
are comparable to the existing chapters, so the same windows approach works; the generator tunes
windows per level the way chapters 3 to 5 do.

## 5. Interface, accessibility, audio

- **Preview before committing.** When a tube is selected, every destination that would *mix* shows a
  swirl badge with the result's swatch and pattern. A plain pour shows nothing. This is the main
  defence against accidental mixes, together with free undo.
- **Animation.** A mix pour is a single drop: a short stream, a swirl at the destination, and the two
  layers cross-fade into the result colour. It reuses the pour stream and the reveal dissolve. Reduce
  Motion shows the result change without the swirl.
- **Recipe key.** Levels with mixing show a small legend ("red + blue = violet") under the top bar,
  next to the existing rules line, and every colour keeps its letter and pattern so the legend does
  not rely on hue. In colour-blind mode the palette is not paint-like, so the legend and patterns
  carry the meaning.
- **Screen readers.** The selected tube announces which destinations mix ("tube 3: pouring a drop of
  crimson here makes violet"), and a mix announces "Mixed crimson and electric blue into violet."
- **Audio and haptics.** One new placeholder sound (`mix.wav`, a soft fizz) and the existing medium
  haptic.
- **Hints.** The hint text for a mix names the colours ("Try mixing CRIMSON into ELECTRIC BLUE").
- **Tutorial.** Three steps on the first mixing level: pick a tube; tap a different colour to mix one
  drop; two drops make two units of a new colour.

Not changed: stars (still from the exact `optimalMoves`), economy, saves (levels are data; the save
format needs no new field), daily puzzle (excluded from the first version).

## 6. Engine, solver and generator work

| Area | Change |
|---|---|
| Types | `Level.rules.mixing?: { pairs: [LiquidColor, LiquidColor][] }`; `GameEvent` gains `mixed`; `GameState` carries the enabled pairs |
| `rules.ts` | `getMoveError` returns no error for a legal mix; `getPourAmount` returns 1 for a mix; `isPointlessMove` unchanged |
| `pour.ts` | mixing branch (section 3); catalyst check on produced colour; settle unchanged |
| `serialize.ts` | validate the pair list against the level on restore |
| `mechSolver.ts` | `hasMechanics` is true when mixing is enabled; replace the heuristic with the safe bound |
| `canonical.ts` | colour relabelling restricted to recipe-preserving permutations |
| generator | recipe-driven composition (2.4), reject levels solvable without mixing, window per level |
| UI | mix badge, mix animation, recipe legend, tutorial step, one sound |
| Tests | rules for every pair and order, conservation, frozen/hidden/lock/catalyst interaction, undo, save and restore, solver agrees with a brute-force check on small levels, every shipped level solvable only with mixing |

Suggested order, each stage shippable behind a feature flag: (A) engine, solver, tests; (B) generator
and the ten levels, verified; (C) interface; (D) tutorial, QA checklist, device testing.

## 7. Evidence from the prototype

Run with `npx tsx scripts/prototypes/mixing.ts`. Positions are 4 units per tube, two empty tubes.

**Feasibility.** Every deal tried was solvable (60 of 60 in every recipe) and solved in a few
hundred nodes; mixing was *required* in all of the forced-mix recipes.

**Optional mixing is a trap.** Random play (uniform over valid moves, 20 plays on each of 12 deals):

| Recipe | Reached the goal | Ended stuck |
|---|---|---|
| R2 B2 (+2 pure), mixing required | 232 / 240 | 8 (all had mixed) |
| R2 B2 (+3 pure), mixing required | 191 / 240 | 49 (47 had mixed) |
| R3 B3 V2, mixing required | 220 / 240 | 20 (19 had mixed) |
| R4 B4 Y4, mixing optional | 146 / 240 | 94 (all had mixed) |

**A wrong mix is a mistake, not a catastrophe.** In mid-game positions sampled from random play, the
share of moves after which the level can no longer be won was 0 to 11% for mixing pours and 1 to 2%
for ordinary pours. Together with free undo and the "unstable" hint this is tolerable; it is also the
reason for the preview badge.

**The old solver bound is wrong for mixing.** Across 320 deals the optimistic run-count heuristic
returned a non-optimal length on **15**. Both safe bounds returned the optimal length every time:

| Heuristic | Median nodes | 90th percentile | Max |
|---|---|---|---|
| Optimistic (inadmissible) | 182 | 534 | 3,954 |
| Halved (safe) | 1,670 | 7,595 | 51,691 |
| Tight (safe, section 2.5) | 1,430 | 6,609 | 51,123 |

Offline generation is unaffected (the largest case, about 51,000 nodes, is below the existing 120,000-node budget).
Runtime hints on mixing levels will time out more often than on classic ones; the hint code already
falls back to "No hint available right now".

**What the prototype did not test:** interaction with hidden, frozen, locked and catalyst mechanics,
real players (does the one-drop rule feel right, is the preview badge enough), runtime hint speed on a
phone, and tertiary mixing.

## 8. Decisions needed from the product owner

1. **The colour wheel.** Approve red-blue-yellow with violet, green and orange as results, leaving
   cyan and magenta pure (recommended), or choose a different table.
2. **Optional mixing.** Approve "a mixing level must need mixing" (recommended), or accept the stuck
   rate of optional mixing and design around it.
3. **One drop per mix** (recommended for clarity) or mix run-for-run.
4. **Confirmation.** Default is a preview badge and free undo, no confirmation step. A "Confirm
   mixing" setting could be added if playtests show accidental mixes frustrate players.
5. **Placement and size.** A new chapter 6 of ten levels after chapter 5 (recommended) or mixing
   interleaved into existing chapters; and whether the daily puzzle should ever mix.
6. **Art and sound.** The mix fizz sound and the swirl badge art need sourcing like the other
   placeholders (see `src/assets/sounds/README.md`).
