import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

function makeSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563EB"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <polyline points="148,172 300,256 148,340" fill="none" stroke="white" stroke-width="56" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="308" y1="348" x2="416" y2="348" stroke="white" stroke-width="52" stroke-linecap="round"/>
</svg>`;
}

function makeCircleSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563EB"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
    <clipPath id="circle"><circle cx="256" cy="256" r="256"/></clipPath>
  </defs>
  <rect width="512" height="512" fill="url(#bg)" clip-path="url(#circle)"/>
  <polyline points="148,172 300,256 148,340" fill="none" stroke="white" stroke-width="56" stroke-linecap="round" stroke-linejoin="round" clip-path="url(#circle)"/>
  <line x1="308" y1="348" x2="416" y2="348" stroke="white" stroke-width="52" stroke-linecap="round" clip-path="url(#circle)"/>
</svg>`;
}

// Pack multiple PNG buffers into a single .ico file (ICO with embedded PNGs)
function packIco(images) {
  // images: [{ size, data: Buffer }]
  const n = images.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dataStart = headerSize + dirEntrySize * n;

  let totalSize = dataStart;
  for (const img of images) totalSize += img.data.length;

  const buf = Buffer.alloc(totalSize);
  buf.writeUInt16LE(0, 0); // reserved
  buf.writeUInt16LE(1, 2); // type: icon
  buf.writeUInt16LE(n, 4); // count

  let offset = dataStart;
  for (let i = 0; i < n; i++) {
    const { size, data } = images[i];
    const base = headerSize + i * dirEntrySize;
    buf.writeUInt8(size === 256 ? 0 : size, base);      // width  (0 = 256)
    buf.writeUInt8(size === 256 ? 0 : size, base + 1);  // height (0 = 256)
    buf.writeUInt8(0, base + 2);                        // color count
    buf.writeUInt8(0, base + 3);                        // reserved
    buf.writeUInt16LE(1, base + 4);                     // planes
    buf.writeUInt16LE(32, base + 6);                    // bit depth
    buf.writeUInt32LE(data.length, base + 8);           // data size
    buf.writeUInt32LE(offset, base + 12);               // data offset
    offset += data.length;
  }

  offset = dataStart;
  for (const { data } of images) {
    data.copy(buf, offset);
    offset += data.length;
  }

  return buf;
}

// ── PNG targets ────────────────────────────────────────────────────
const targets = [
  { file: 'logo.png',                   size: 512, fn: makeSvg },
  { file: 'appIcon.png',                size: 512, fn: makeSvg },
  { file: 'android-chrome-512x512.png', size: 512, fn: makeSvg },
  { file: 'android-chrome-192x192.png', size: 192, fn: makeSvg },
  { file: 'apple-touch-icon.png',       size: 180, fn: makeSvg },
  { file: 'favicon-32x32.png',          size: 32,  fn: makeSvg },
  { file: 'favicon-16x16.png',          size: 16,  fn: makeSvg },
  { file: 'cropped_circle_image.png',   size: 512, fn: makeCircleSvg },
];

for (const { file, size, fn } of targets) {
  await sharp(Buffer.from(fn(size)))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(join(publicDir, file));
  console.log(`✓ ${file} (${size}×${size})`);
}

// ── favicon.ico — embed 16, 32, 48 px PNG layers ──────────────────
const icoSizes = [16, 32, 48];
const icoImages = [];
for (const size of icoSizes) {
  const data = await sharp(Buffer.from(makeSvg(size)))
    .resize(size, size)
    .png()
    .toBuffer();
  icoImages.push({ size, data });
}
writeFileSync(join(publicDir, 'favicon.ico'), packIco(icoImages));
console.log('✓ favicon.ico (16+32+48 px layers)');

console.log('\nAll icons generated.');
