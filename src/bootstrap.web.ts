// Web build (used for browser QA): Skia needs CanvasKit loaded before it is first imported,
// so the router entry is required only after loading finishes.
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

LoadSkiaWeb({ locateFile: (file: string) => `/${file}` }).then(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('expo-router/entry');
});
