// Web build (used for browser QA): Skia needs CanvasKit loaded before it is first imported.
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

LoadSkiaWeb({ locateFile: (file: string) => `/${file}` }).then(async () => {
  const { registerRootComponent } = await import('expo');
  const { default: App } = await import('../App');
  registerRootComponent(App);
});
