/*
 * Colour identification.
 *
 * No model involved — this is plain pixel maths. We decode the garment photo,
 * throw away what looks like background, average what remains, and snap the
 * result to the nearest name in the palette the recommender scores on.
 *
 * Keeping the output inside SWATCH matters: colourScore() in recommend.js
 * checks membership of NEUTRALS and FAMILY by exact name, so an invented
 * colour name would silently score as a clashing loud colour.
 */

import { SWATCH } from '../theme/theme';

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/*
 * sRGB -> CIE Lab.
 *
 * Worth the ~20 lines: distances in Lab track how different two colours
 * actually look, which RGB and HSL both get badly wrong across this palette
 * (Beige, Cream and Brown are far apart to the eye but close in RGB).
 */
function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function rgbToLab(r, g, b) {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);

  /* Linear RGB -> XYZ, D65 white point. */
  const x = (rl * 0.4124 + gl * 0.3576 + bl * 0.1805) / 0.95047;
  const y = rl * 0.2126 + gl * 0.7152 + bl * 0.0722;
  const z = (rl * 0.0193 + gl * 0.1192 + bl * 0.9505) / 1.08883;

  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return { L: 116 * fy - 16, a: 500 * (fx - fy), bb: 200 * (fy - fz) };
}

/* The palette, pre-converted to Lab once. */
const PALETTE = Object.entries(SWATCH).map(([name, hex]) => {
  const { r, g, b } = hexToRgb(hex);
  return { name, ...rgbToLab(r, g, b) };
});

export function nearestPaletteName(r, g, b) {
  const px = rgbToLab(r, g, b);
  let best = PALETTE[0];
  let bestD = Infinity;
  for (const swatch of PALETTE) {
    const dL = px.L - swatch.L;
    const da = px.a - swatch.a;
    const db = px.bb - swatch.bb;
    const d = dL * dL + da * da + db * db;
    if (d < bestD) {
      bestD = d;
      best = swatch;
    }
  }
  return best.name;
}

/*
 * Find the garment colour in a decoded RGBA buffer.
 *
 * Averaging the whole frame only works when the background is white. Shot on
 * a wooden table or a bed, the average lands somewhere between the cloth and
 * the surface and is wrong for both. So instead we take the dominant colour
 * *cluster*: bin the centre of the frame into a coarse histogram, pick the
 * most populous bin, and average only the pixels that belong to it. As long
 * as the garment fills most of the middle of the shot, it wins the vote and
 * the background drops out regardless of what colour it is.
 */
const BIN = 32;
const BINS_PER_CHANNEL = Math.ceil(256 / BIN);

export function dominantColour(pixels, width, height) {
  const cropX0 = Math.floor(width * 0.2);
  const cropX1 = Math.ceil(width * 0.8);
  const cropY0 = Math.floor(height * 0.2);
  const cropY1 = Math.ceil(height * 0.8);
  const midX = (cropX0 + cropX1) / 2;
  const midY = (cropY0 + cropY1) / 2;
  const spanX = Math.max(1, (cropX1 - cropX0) / 2);
  const spanY = Math.max(1, (cropY1 - cropY0) / 2);

  const hist = new Float64Array(BINS_PER_CHANNEL ** 3);
  const sums = new Float64Array(hist.length * 3);
  let considered = 0;

  for (let y = cropY0; y < cropY1; y++) {
    for (let x = cropX0; x < cropX1; x++) {
      const i = (y * width + x) * 4;
      if (pixels[i + 3] < 128) continue;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      /* Pixels nearer the middle of the frame count for more. */
      const dx = (x - midX) / spanX;
      const dy = (y - midY) / spanY;
      const weight = 1 / (1 + dx * dx + dy * dy);

      const bin =
        ((r / BIN) | 0) * BINS_PER_CHANNEL * BINS_PER_CHANNEL +
        ((g / BIN) | 0) * BINS_PER_CHANNEL +
        ((b / BIN) | 0);

      hist[bin] += weight;
      sums[bin * 3] += r * weight;
      sums[bin * 3 + 1] += g * weight;
      sums[bin * 3 + 2] += b * weight;
      considered += weight;
    }
  }

  if (!considered) return { r: 142, g: 142, b: 142, name: 'Grey' };

  let modal = -1;
  let modalWeight = -1;
  for (let i = 0; i < hist.length; i++) {
    if (hist[i] > modalWeight) {
      modalWeight = hist[i];
      modal = i;
    }
  }

  const seed = {
    r: sums[modal * 3] / modalWeight,
    g: sums[modal * 3 + 1] / modalWeight,
    b: sums[modal * 3 + 2] / modalWeight,
  };

  /*
   * Refine: the garment may straddle two adjacent bins, so pool every pixel
   * that is perceptually close to the modal colour rather than just that bin.
   */
  const seedLab = rgbToLab(seed.r, seed.g, seed.b);
  const acc = { r: 0, g: 0, b: 0, n: 0 };
  for (let i = 0; i < hist.length; i++) {
    if (!hist[i]) continue;
    const br = sums[i * 3] / hist[i];
    const bg = sums[i * 3 + 1] / hist[i];
    const bb = sums[i * 3 + 2] / hist[i];
    const lab = rgbToLab(br, bg, bb);
    const dL = lab.L - seedLab.L;
    const da = lab.a - seedLab.a;
    const db = lab.bb - seedLab.bb;
    if (Math.sqrt(dL * dL + da * da + db * db) > 18) continue;
    acc.r += br * hist[i];
    acc.g += bg * hist[i];
    acc.b += bb * hist[i];
    acc.n += hist[i];
  }

  const source = acc.n ? acc : { r: seed.r, g: seed.g, b: seed.b, n: 1 };
  const r = Math.round(source.r / source.n);
  const g = Math.round(source.g / source.n);
  const b = Math.round(source.b / source.n);
  return { r, g, b, name: nearestPaletteName(r, g, b) };
}
