/*
 * Copies CanvasKit's wasm into public/ so the web build can load Skia.
 * Plain Node (no mkdir/cp) so it also works on Windows. Run automatically by `npm run web`
 * and after `npm install`; safe to run repeatedly.
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', 'canvaskit-wasm', 'bin', 'full', 'canvaskit.wasm');
const destDir = path.join(__dirname, '..', 'public');
const dest = path.join(destDir, 'canvaskit.wasm');

if (!fs.existsSync(src)) {
  console.warn('setup-web: canvaskit-wasm is not installed yet; skipping (run npm install first).');
  process.exit(0);
}
fs.mkdirSync(destDir, { recursive: true });
if (!fs.existsSync(dest) || fs.statSync(dest).size !== fs.statSync(src).size) {
  fs.copyFileSync(src, dest);
  console.log('setup-web: copied canvaskit.wasm to public/');
}
