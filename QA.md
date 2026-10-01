# Manual QA

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
