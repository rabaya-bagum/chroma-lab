# Manual QA

For frame rate, audio, splash, persistence and other hardware-only checks see `docs/DEVICE_TEST_PLAN.md`.

## Phase 1
- [ ] App launches in Expo Go on iOS and on Android.
- [ ] Level list shows 25 levels; tapping one opens the game screen.
- [ ] Level 1: tap a tube (it lifts and highlights), tap an empty tube (units move), finish in 4 moves; EXPERIMENT COMPLETE shows 3 stars.
- [ ] Invalid pour (different colour) keeps the selection or moves it, never changes tubes.
- [ ] A full single-colour tube is sealed and cannot be selected.
- [ ] UNDO is disabled with no moves; UNDO restores tubes and the move count.
- [ ] RESTART resets the level; + TUBE adds one tube once and it survives RESTART.
- [ ] Deadlock banner appears when no useful move remains.
- [ ] Small phone (about 360x640 dp): all 6-tube boards fit without horizontal scroll.
- [ ] Screen reader reads each tube (for example "Tube 3 of 5: bottom to top red, blue. 2 free spaces").

## Phase 2
- [ ] Level 5 on a real device: selecting lifts and glows a tube; a pour tilts toward the destination, a stream fills it, levels move in sync, bubbles appear, the tube returns. Whole pour feels under about 0.65 s.
- [ ] Completing a tube seals it with a cap, a glow pulse and a success haptic; finishing the level plays the glow sequence, sparks and brighten, then the results panel (tap to skip).
- [ ] Pour from a tube in the far-left and far-right columns: the tilted tube stays on screen.
- [ ] 60 FPS during pours on a mid-range Android phone (Pixel 6a class); check with the performance monitor. Not measured in development (no device).
- [ ] Settings: Pattern overlays, Colour labels (letters need a device font), Colour-blind mode, High contrast all visibly change tubes.
- [ ] Reduce Motion ON (and via the OS setting with the app on SYSTEM): no tube travel, tilt, stream, ambient waves or particles; pour is a short level change; undo still works.
- [ ] Screen reader (VoiceOver / TalkBack): each tube reads e.g. "Tube 3 of 8: bottom crimson, crimson, electric blue, top electric blue. 0 free spaces."; selected and complete states are announced; a pour announces "Poured 2 ... from tube 1 to tube 3".
- [ ] Undo slides levels back; RESTART asks for confirmation only at 5 or more moves; a + TUBE tube survives RESTART.
- [ ] Haptics: select, pour, invalid tap, tube complete, level complete (success then heavy). Toggling Haptics/Sound/Music in Settings silences each independently. Sounds are silent placeholders until real audio is added.
- [ ] Small phone (about 360x640 dp) and tablet layouts: tubes fit without scrolling; partial last row is centred; tap targets at least 48 dp.
- [ ] Backgrounding the app mid-pour returns to a correct board.

## Phase 3
- [ ] First launch: native splash flows into the liquid-fill splash (about 1.2 s), then Home. Button reads PLAY for a new player.
- [ ] Level 1 tutorial: the four steps appear in order, only the ringed tube responds in steps 1-2, finishing the level shows EXPERIMENT COMPLETE with 3 stars, Moves 4, Best 4, coins counting up (250 total on a perfect first clear including achievements) and achievement toasts with a sound.
- [ ] Kill the app mid-level (swipe away) and relaunch: Home shows CONTINUE; it reopens the same board, move count and any purchased extra tube; no tutorial restart. Press Back from a level, relaunch: no resume (the visit ended).
- [ ] Background the app on a level, return: board unchanged; the save survives a force quit right after a completion.
- [ ] Level Select: chapters 1-2 listed, 3-5 show Coming soon; locked cards ignore taps and explain why; completed cards glow and show stars; level N+1 unlocks after N.
- [ ] Play through to level 25 (or seed a save): level 11+ extra tube costs 100 coins, is disabled with the price greyed when short, free on levels 1-10; stars cap at 2 after using it.
- [ ] Settings: every toggle works and persists across relaunch; Replay tutorial opens level 1 with the tutorial; Reset progress asks twice and wipes levels, stars and coins but keeps settings; achievements list shows unlocked state.
- [ ] Corrupt save: set the stored value to garbage (or install over an incompatible build), relaunch: a SAVE RESET toast appears and the game starts fresh; the old value is kept under `chroma.save.corrupt.<time>`.
- [ ] Reduce Motion: splash fill, Home background and win overlay do not animate; screen reader reads Home, Level Select, cards ("Level 4, medium, 2 of 3 stars" / "Level 7, locked"), toasts and the overlay.
- [ ] Hardware back on Android from the game screen returns to the previous screen and ends the visit.

## Phase 4
- [ ] Hint: tap HINT on a mid-game board. A ring appears on the source tube, then the destination, with "Try moving <COLOUR> here." Nothing moves by itself. Pour animations stay smooth while the hint is computed (no dropped frames; the button shows "..." briefly).
- [ ] Hint on an unsolvable board (dead end): toast says "This mixture is unstable - try Undo." and no coins are charged.
- [ ] Hint pricing: free on levels 1-10; from level 11 the first hint is free, later ones show 50 and the button is disabled when coins are short. Hints never change the star preview.
- [ ] Daily Experiment: first open shows SYNTHESISING briefly, then difficulty, streak, today's state. Two devices (same app build, same local date) show the identical board. After finishing, the screen shows COMPLETE with best moves and time and PLAY AGAIN; replaying pays no coins and keeps the streak.
- [ ] Daily streak: finish on consecutive days (change the device date to test) and the streak rises with the bonus (10 per day, max 70); skip a day and it resets to 1. Day 7 unlocks the Weekly Research achievement.
- [ ] Daily offline fallback: with generation disabled or failing, a pool puzzle is used and the same puzzle persists across relaunches that day.
- [ ] Collection: tabs show three items each; tapping any item (even locked) shows a live preview of the pour; UNLOCK is disabled when coins are short; buying equips; Crystal unlocks at 25 stars, Cyber Lab at 40, Plasma after 5 daily completions.
- [ ] Cosmetics apply on the game board, Home background and Laboratory, and persist across relaunch.
- [ ] Laboratory: Microscope appears at 10 stars, Centrifuge at 25, Research Computer at 45, Robotic Arm at 65; unlocked pieces animate in and idle; locked ones are silhouettes with thresholds; the three future pieces say "Future chapters"; Reduce Motion keeps everything still.
- [ ] A completion that unlocks something shows a toast (new collection item or laboratory upgrade) after the results appear.

## Phase 5
- [ ] Chapters 3-5 appear in Level Select (26-35, 36-45, 46-55) and unlock in order after level 25.
- [ ] Frozen liquid (level 26): frozen layers show frost and cracks and cannot be tapped or poured onto; liquid above them moves; when the condition in the rules line is met the frost melts with a warm glow and the tube becomes usable.
- [ ] Mystery liquid (level 36): hidden layers are dark with a "?"; uncovering one dissolves it into its colour with a sparkle; screen readers say "unknown" for hidden layers.
- [ ] Locked tubes (level 46): padlock with a live counter ("3/7 moves", "1/2 tubes", or a colour); the tube cannot be selected or poured into; at the condition the lock swells and fades and the tube accepts liquid.
- [ ] Catalysts (levels 47, 49, 51): a tube with a pulsing coloured core; pouring its colour in for the first time shows a ring burst, an arc to the target, then the unlock, thaw or reveal; pouring the colour again does nothing.
- [ ] Undo reverses every mechanic (re-freezes, re-hides, re-locks, un-spends the catalyst). Restart, + TUBE, hint, kill-and-resume all work on mechanic levels.
- [ ] Reactor (levels 30, 40, 50): the meter fills per move and never counts time; solving within the limit shows REACTOR BONUS on the results (once per level); going past the limit shows STABILISED and the level can still be finished.
- [ ] Each mechanic level shows its rules in plain language under the top bar; with Reduce Motion the arcs and dissolves are replaced by instant changes.
- [ ] Hints on mechanic levels return a legal move or "No hint available right now" (the search may time out on the hardest ones); they never block animation.
- [ ] Performance: pours with frost, veils and padlocks on screen stay smooth on a mid-range Android phone.

## Colour mixing (Chapter 6)
- [ ] Level 56 shows the recipe legend and the three-step mixing tutorial on first play; Skip works.
- [ ] Selecting a tube shows the result colour above each tube it would mix with, and nothing above the others.
- [ ] Pouring red onto blue (and blue onto red) leaves two violet units in the destination and one fewer unit in the source.
- [ ] A full destination refuses a mix (shake); a frozen top refuses a mix.
- [ ] Undo after a mix restores both tubes; Restart works; closing and resuming mid-level keeps the mixed state.
- [ ] Hint on a mixing move reads "Try mixing X into Y".
- [ ] Screen reader: with a tube selected, tubes announce "pouring here mixes purple"; a mix announces "Mixed red with blue into two purple".
- [ ] Levels 56-65 are all completable; 60 shows the reactor meter; 62 and 64 mix with hidden layers; 65 has a locked tube.
- [ ] The daily experiment never offers mixing.
