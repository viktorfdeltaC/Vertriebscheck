// Generates PWA icons from the Wertentwickler logo.
// Usage: node scripts/generate-pwa-icons.mjs
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const src = resolve(root, 'public/assets/Wertentwickler logo1.png');
const outDir = resolve(root, 'public/icons');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const PADDING_RATIO = 0.18;
const BG = { r: 27, g: 42, b: 74, alpha: 1 }; // #1B2A4A

await mkdir(outDir, { recursive: true });

for (const size of sizes) {
  const inner = Math.round(size * (1 - PADDING_RATIO * 2));
  const logo = await sharp(src)
    .resize({ width: inner, height: inner, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(resolve(outDir, `icon-${size}x${size}.png`));
  console.log(`✓ icon-${size}x${size}.png`);
}

// Apple touch icon (180x180, opaque)
const apple = 180;
const appleInner = Math.round(apple * (1 - PADDING_RATIO * 2));
const appleLogo = await sharp(src)
  .resize({ width: appleInner, height: appleInner, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();
await sharp({ create: { width: apple, height: apple, channels: 4, background: BG } })
  .composite([{ input: appleLogo, gravity: 'center' }])
  .png()
  .toFile(resolve(outDir, 'apple-touch-icon.png'));
console.log('✓ apple-touch-icon.png');
