import sharp from 'sharp';
import { GifWriter } from 'omggif';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SIZE   = 256;
const FRAMES = 48;
const DELAY  = 5;    // 50 ms per frame ≈ 20 fps, 2.4 s loop

// Three staggered rings create a continuous sonar-style outward pulse.
// Each ring period = FRAMES/2 (24 frames), staggered by FRAMES/3 (16 frames),
// so 3 rings are always visible at evenly-spread radii simultaneously.
const RING_PERIOD  = FRAMES / 2;   // 24 frames
const RING_STAGGER = FRAMES / 3;   // 16 frames

function frameSvg(f) {
  const t = f / FRAMES;   // 0..1

  // Cursor: 12 on / 8 off per 20-frame blink cycle (600 ms on, 400 ms off)
  const showCursor = (f % 20) < 12;

  function ring(phaseIdx) {
    const offset = phaseIdx * RING_STAGGER;
    const lt = (((f - offset) % RING_PERIOD) + RING_PERIOD) % RING_PERIOD / RING_PERIOD;
    const r  = 40 + lt * 195;          // radius: 40 → 235 (in 512-px viewport)
    const op = lt < 0.15
      ? (lt / 0.15) * 0.22             // quick fade in
      : (1 - (lt - 0.15) / 0.85) * 0.22; // long fade out
    return { r, op: Math.max(0, op) };
  }

  const rings = [0, 1, 2].map(ring);

  // Scan line sweeps top → bottom over the full loop
  const scanY  = 88 + t * 336;
  const scanOp = 0.10 + 0.07 * Math.sin(t * Math.PI * 6);

  // Corner HUD bracket glow — slow pulse
  const bOp = 0.28 + 0.18 * Math.sin(t * Math.PI * 2);

  // Corner indicator dots — alternating twinkle, faster
  const dA = 0.20 + 0.60 * Math.abs(Math.sin(t * Math.PI * 4));
  const dB = 0.20 + 0.60 * Math.abs(Math.sin(t * Math.PI * 4 + Math.PI * 0.5));

  const ringElems = rings
    .filter(({ op }) => op > 0.005)
    .map(({ r, op }) =>
      `<circle cx="256" cy="256" r="${r.toFixed(1)}" fill="none" ` +
      `stroke="rgba(255,255,255,${op.toFixed(3)})" stroke-width="5"/>`)
    .join('\n  ');

  const cursor = showCursor
    ? `<line x1="308" y1="348" x2="416" y2="348" stroke="white" stroke-width="52" stroke-linecap="round"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${SIZE}" height="${SIZE}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563EB"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
    <clipPath id="box"><rect width="512" height="512" rx="112"/></clipPath>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>

  <!-- Corner HUD targeting brackets -->
  <path d="M88,148 L88,88 L148,88"   stroke="rgba(255,255,255,${bOp.toFixed(3)})" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M364,88 L424,88 L424,148" stroke="rgba(255,255,255,${bOp.toFixed(3)})" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M88,364 L88,424 L148,424" stroke="rgba(255,255,255,${bOp.toFixed(3)})" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M424,364 L424,424 L364,424" stroke="rgba(255,255,255,${bOp.toFixed(3)})" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Continuous sonar pulse rings -->
  ${ringElems}

  <!-- Scan line clipped to icon bounds -->
  <rect x="56" y="${(scanY - 1).toFixed(1)}" width="400" height="3"
    fill="rgba(255,255,255,${scanOp.toFixed(3)})" clip-path="url(#box)" rx="1.5"/>

  <!-- Terminal symbol: > chevron -->
  <polyline points="148,172 300,256 148,340"
    fill="none" stroke="white" stroke-width="56"
    stroke-linecap="round" stroke-linejoin="round"/>

  <!-- _ cursor (blinking) -->
  ${cursor}

  <!-- Corner status dots (alternating twinkle) -->
  <circle cx="172" cy="120" r="7" fill="rgba(255,255,255,${dA.toFixed(3)})"/>
  <circle cx="340" cy="120" r="7" fill="rgba(255,255,255,${dB.toFixed(3)})"/>
  <circle cx="172" cy="392" r="7" fill="rgba(255,255,255,${dB.toFixed(3)})"/>
  <circle cx="340" cy="392" r="7" fill="rgba(255,255,255,${dA.toFixed(3)})"/>
</svg>`;
}

async function render(svgStr) {
  return sharp(Buffer.from(svgStr))
    .resize(SIZE, SIZE)
    .raw()
    .toBuffer();
}

async function main() {
  // Render all frames to raw RGBA
  const raws = [];
  for (let f = 0; f < FRAMES; f++) {
    raws.push(await render(frameSvg(f)));
    process.stdout.write(`\rRendering ${f + 1}/${FRAMES}`);
  }
  console.log('');

  // Build frequency palette: top-255 colors across all frames
  const freq = new Map();
  for (const raw of raws) {
    for (let i = 0; i < raw.length; i += 4) {
      const key = (raw[i] << 16) | (raw[i + 1] << 8) | raw[i + 2];
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
  }

  let palette = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 255)
    .map(([k]) => k);
  while (palette.length < 256) palette.push(0x000000);

  const exactMap  = new Map(palette.map((c, i) => [c, i]));
  const missCache = new Map();

  function nearestIdx(r, g, b) {
    const key = (r << 16) | (g << 8) | b;
    const exact = exactMap.get(key);
    if (exact !== undefined) return exact;
    const cached = missCache.get(key);
    if (cached !== undefined) return cached;
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < 255; i++) {
      const c  = palette[i];
      const dr = (c >> 16 & 0xff) - r;
      const dg = (c >>  8 & 0xff) - g;
      const db = (c       & 0xff) - b;
      const d  = dr*dr + dg*dg + db*db;
      if (d < bestDist) { bestDist = d; best = i; }
    }
    missCache.set(key, best);
    return best;
  }

  // Encode GIF
  console.log('Encoding GIF…');
  const buf    = Buffer.alloc(SIZE * SIZE * FRAMES * 8 + 4096);
  const writer = new GifWriter(buf, SIZE, SIZE, { loop: 0, palette });

  for (let f = 0; f < FRAMES; f++) {
    const raw     = raws[f];
    const indexed = new Uint8Array(SIZE * SIZE);
    for (let i = 0; i < SIZE * SIZE; i++) {
      indexed[i] = nearestIdx(raw[i * 4], raw[i * 4 + 1], raw[i * 4 + 2]);
    }
    writer.addFrame(0, 0, SIZE, SIZE, indexed, { delay: DELAY });
    process.stdout.write(`\rEncoding ${f + 1}/${FRAMES}`);
  }

  const gifData = buf.slice(0, writer.end());
  writeFileSync(join(__dirname, '..', 'public', 'ai.gif'), gifData);
  console.log(`\n✓ ai.gif  →  ${(gifData.length / 1024).toFixed(0)} KB`);
}

main().catch(err => { console.error(err); process.exit(1); });
