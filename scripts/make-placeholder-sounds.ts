/* Writes silent WAV placeholders with the final file names. Usage: npx tsx scripts/make-placeholder-sounds.ts */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const dir = join(__dirname, '../src/assets/sounds');
mkdirSync(dir, { recursive: true });

// name -> duration in seconds
const FILES: Record<string, number> = {
  pour: 0.6, glass_tap: 0.15, invalid: 0.2, tube_complete: 0.7, button: 0.1,
  win: 2.0, unlock: 0.8, coin: 0.3, reveal: 0.6, thaw: 0.9, ambient_lab: 4.0,
};

function silentWav(seconds: number): Buffer {
  const rate = 8000;
  const samples = Math.round(seconds * rate);
  const data = Buffer.alloc(samples * 2); // 16-bit mono, zeros = silence
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

for (const [name, secs] of Object.entries(FILES)) writeFileSync(join(dir, `${name}.wav`), silentWav(secs));
console.log(`Wrote ${Object.keys(FILES).length} placeholder files to ${dir}`);
