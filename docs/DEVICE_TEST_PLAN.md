# Device test plan

These are the things that could not be verified in the development container (Node plus a software-GL headless browser). Run them on real hardware and record the result in the table at the bottom. `QA.md` holds the per-feature checklists; this plan adds the measured and hardware-only checks.

## Devices

Minimum: one low-end Android phone (about 3 GB RAM, 2019-2021 class), one recent Android phone, one iPhone (any supported by SDK 57), and one tablet (iPad or Android) for layout. Use a preview/development build (`eas build --profile preview`), not Expo Go, for the performance and splash checks.

## 1. Frame rate (target 60 FPS)

How to measure: the `preview` EAS profile builds with the on-screen frame-rate overlay (`EXPO_PUBLIC_PERF_OVERLAY=1`; top-left of the board: fps over the last half second, worst frame, and `FULL`/`LITE`). If a board reports `LITE` on a phone that should manage 60 fps, note the device and level: that is the adaptive quality governor reacting to real frame times. Otherwise shake to open the dev menu and enable **Show Perf Monitor** (development build), or use Android's *Profile GPU rendering* / `adb shell dumpsys gfxinfo <package> framestats`. Read the UI and JS frame rates.

| Scenario | Pass |
|---|---|
| Idle board, 8-9 tubes (level 25), ambient bubbles on | >= 55 FPS |
| A pour with the Sparkle effect and a skin with shimmer | >= 50 FPS during the pour, no dropped animation |
| Frozen + mystery + locked tubes on one board (levels 31, 44, 54) | >= 55 FPS idle, >= 50 FPS pouring |
| Win flourish with 9 tubes plus particles (<= 120) | >= 45 FPS |
| Level Select scrolling, Collection and Laboratory screens | no visible jank |

Also record whether the overlay ever switched to `LITE` during the run and when (it steps down after about 2 s below ~41 fps, and back up after 15 s above ~55 fps, at most once). Fail action: note device, level and cosmetic. The usual levers are the particle cap (`src/render/particles.ts`), the ambient bubble interval in `GameBoard.tsx`, and `reduceMotion`.

## 2. Hint latency

Press Hint on levels 25, 44, 55 and 65. The board must keep animating (no freeze longer than one frame). Record time to answer; "No hint available right now" on the hardest levels is acceptable.

## 3. Audio (after real files replace the placeholders)

- Every sound plays once per event: pour, tap, invalid, tube complete, button, win, unlock, coin, reveal, thaw, **mix**.
- Up to three overlapping sounds work; rapid pours do not crackle.
- Sound and Music toggles work; music ducks during the win flourish and recovers.
- iOS silent switch silences effects; headphones and Bluetooth routing are fine; a phone call or alarm interrupts and the app recovers.

## 4. Splash and icon

- Cold start shows the navy splash with the tube, then the Home screen with no white flash on iOS or Android (including Android 12+ splash API).
- Home-screen icon and Android adaptive icon (round, squircle, and themed/monochrome on Android 13+) are not clipped; the tube is centred.

## 5. Persistence (AsyncStorage on native)

- Solve a level, force-quit, relaunch: stars, coins and unlocks remain.
- Quit mid-level (after a mixing pour on level 56, and on a level with a frozen or locked tube): relaunch resumes the exact board; Undo still works.
- Background the app mid-pour for 30 s and return: the board is consistent and the timer did not count background time.
- Corrupt-save recovery cannot be forced on device; it is covered by tests.

## 6. Settings and alerts

- Settings > Reset progress shows the native confirmation and really resets (stars, coins, collection, daily, laboratory).
- Replay tutorial runs level 1's tutorial; level 56's mixing tutorial runs on first play and can be skipped.
- Restart after 5+ moves shows the confirmation.

## 7. Rendering on native

These were only checked in a browser:

- Skia `PathBuilder` shapes (tubes, caps, laboratory art) render identically to the web build.
- Tilted source tube during a pour is never clipped, on the smallest phone (about 360x640 dp) and on a tablet.
- No black blob in empty tubes; the mix result colour appears when the drop lands; undo of a mixing pour looks acceptable.
- Frost, veil, padlock and catalyst visuals are legible in all four lab themes.

## 8. Accessibility on device

- TalkBack and VoiceOver: tube labels, the mixing preview ("pouring here mixes purple"), event announcements ("Mixed red with blue into two purple"), tutorial and win overlays.
- Colour-blind palette, patterns and labels, high contrast, Reduce Motion (OS setting is honoured), system font scale 200% (no clipped buttons).
- Touch targets are at least 44-48 dp on the smallest phone.

## 9. Layouts

Small phone (about 360x640 dp), large phone, tablet portrait, and a device with a notch or gesture bar: nothing under system bars, all 9 tubes visible on level 25.

## 10. Install and update

- A fresh install on Android (preview APK) and iOS (TestFlight or simulator) launches with no crash and no permission prompt.
- Installing a newer build over an older one keeps the save.

## Results

| Date | Device / OS | Build | Section | Result | Notes |
|---|---|---|---|---|---|
| | | | | | |
