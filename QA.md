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
