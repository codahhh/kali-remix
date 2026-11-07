import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const src = 'public/icons/icon.svg';
mkdirSync('public/icons', { recursive: true });

const jobs = [
  ['public/icons/icon-192.png', 192, false],
  ['public/icons/icon-512.png', 512, false],
  ['public/icons/apple-touch-icon.png', 180, false],
  ['public/icons/icon-maskable-512.png', 512, true],
  ['public/favicon-32.png', 32, false],
];

for (const [out, size, maskable] of jobs) {
  const base = sharp(src, { density: 384 }).resize(size, size, { fit: 'cover' });
  const img = maskable ? base.flatten({ background: '#070b14' }) : base;
  await img.png({ compressionLevel: 9 }).toFile(out);
  console.log('wrote', out);
}
