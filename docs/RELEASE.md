# Release readiness

What is ready, what is placeholder, and what only the owner can do. Written for Phase 6.

## What is configured in the repo

| Item | Where | Notes |
|---|---|---|
| App name, version, description | `app.json` | `Chroma Lab`, `1.0.0` |
| Bundle id / package | `app.json` (`ios.bundleIdentifier`, `android.package`) | **`com.chromalab.app` is a placeholder.** Change it before the first store build: it cannot be changed after the app is created in a store. |
| Build numbers | `eas.json` (`appVersionSource: remote`, production `autoIncrement`) | `buildNumber` / `versionCode` start at 1 and EAS increments them. |
| Build profiles | `eas.json` | `development` (dev client, iOS simulator), `preview` (internal; Android APK), `production` (store). |
| Icon, adaptive icon, splash, favicon | `assets/*.png`, sources in `assets/branding/*.svg` | Placeholder branding: a test tube of four colours on the lab navy. Replace the SVG sources (or the PNGs) with final art; icon is 1024 px, opaque (no alpha) as iOS requires. |
| Permissions | `app.json` `android.blockedPermissions` | The app needs none. Microphone, storage and overlay permissions are blocked so no library can add them. |
| Export compliance | `ios.config.usesNonExemptEncryption: false` | The app makes no network calls and has no custom encryption. |
| Orientation / theme | `app.json` | Portrait, dark. |

## Build and submit (owner steps)

Run these yourself; they need your Expo and store accounts.

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure           # first time only; links the project id
npx eas-cli@latest build --profile preview --platform android   # installable APK for testing
npx eas-cli@latest build --profile development --platform ios   # simulator build
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --profile production --platform all
```

Before the first production build:

1. Pick the final bundle id / package and update `app.json`.
2. Replace placeholder art and sounds (`assets/branding`, `src/assets/sounds/README.md`).
3. Run the device plan in `docs/DEVICE_TEST_PLAN.md` on at least one low-end Android phone and one iPhone.
4. Check the name "Chroma Lab" for trademark clearance (SPEC section 20, question 4).
5. Host the privacy policy (`docs/PRIVACY_POLICY.md`) at a public URL; both stores ask for one.

## Privacy and permissions review

- **Network:** none. No `fetch`, sockets or analytics endpoints exist in `src/`. Analytics, ads, purchases, leaderboard and cloud sync are no-op stubs (SPEC section 19).
- **Data stored:** one JSON save (progress, coins, settings, current level) in on-device storage (AsyncStorage). It is never sent anywhere.
- **Permissions:** none requested. `expo-haptics` and `expo-audio` (playback only) need no permission.
- **Third-party SDKs:** none that collect data.
- **Consequence:** App Store "Data not collected" and Google Play "No data collected / shared" are accurate today. **If any real analytics, ads or sync service is added, this review, the privacy policy and both store declarations must be redone.**
- **Children:** the game is suitable for all ages, has no chat, ads or purchases, and is not directed at children under 13 in particular. Confirm the age-rating questionnaire yourself.

## Store listing

Draft text is in `docs/STORE_LISTING.md`. Screenshots are not generated here: capture them from a real build (six phone shots: level 1, a mid chapter, frozen/mystery levels, a mixing level with the recipe legend, the laboratory, the collection).

## Known limits to disclose to yourself

- Sounds are silent placeholders and the music is a silent loop, so the build is silent until real audio is added.
- Performance on devices has not been measured (see the device plan).
- Expo documentation was not reachable from the build container, so config fields were chosen from knowledge of the stable app config schema and checked with `npx expo config`. `npx expo-doctor` and the first EAS build are the real validation.
