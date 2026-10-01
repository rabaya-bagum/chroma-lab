# Sounds

Every file here is a **silent placeholder** with its final name. No audio was downloaded. Replace each file in place (keep the name and WAV/any format `expo-audio` supports; if you change the extension, update `src/services/audio.ts`). Source CC0 or properly licensed audio, for example from freesound.org (filter by CC0) or a paid library, and record the licence for each file.

| File | Intended feel | Duration |
|---|---|---|
| `pour.wav` | Soft, clean liquid pour, gentle glug at the end. Pitch is varied slightly at runtime, so avoid strong tonal content. | about 0.6 s |
| `glass_tap.wav` | Light glass tick for selecting a tube. | about 0.15 s |
| `invalid.wav` | Muted, low, non-harsh "no". | about 0.2 s |
| `tube_complete.wav` | Bright glass chime with a short seal click. | about 0.7 s |
| `button.wav` | Soft UI click. | about 0.1 s |
| `win.wav` | Warm rising arpeggio with a shimmer tail. | about 2 s |
| `unlock.wav` | Crystalline shatter into a chime. | about 0.8 s |
| `coin.wav` | Short sparkle ping. | about 0.3 s |
| `reveal.wav` | Airy dissolve with a soft sparkle. | about 0.6 s |
| `thaw.wav` | Ice crack followed by a soft melt. | about 0.9 s |
| `mix.wav` | Soft bubbling fizz resolving into a gentle two-note chime: two colours becoming a new one. | about 0.5 s |
| `ambient_lab.wav` | Calm, seamless ambient lab loop. Played at 30% volume by default and ducked during the win sequence. | 60 s or more, loopable |

Regenerate the silent placeholders with `npx tsx scripts/make-placeholder-sounds.ts` (this overwrites real files, so do not run it after adding real audio).
