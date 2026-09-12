/*
 * Garment tagging.
 *
 * One resize of the photo feeds two readers:
 *  - colour, from pixel maths on this device (colour.js) — no network needed,
 *    and more accurate for colour than asking a vision model
 *  - category and fit, from FashionCLIP running in server/ (tagger.js)
 *
 * FashionCLIP is zero-shot, so the label set lives in the server's prompts and
 * nothing here needs retraining when it changes.
 *
 * Nothing in here throws. If the server is unreachable the item still comes
 * back with its colour filled in, flagged `needsReview` so the editor opens.
 */

import { loadPixels } from './imaging';
import { dominantColour } from './colour';
import { tagImage } from './tagger';
import { describeGarment } from './describeGarment';
import { TYPES, FITS } from '../theme/theme';

/* Below this the model is guessing, so send the user to the editor. */
const CONFIDENCE_FLOOR = 0.45;

const CAT_DISPLAY = {
  Shirt: 'Shirt',
  Tee: 'Cotton tee',
  Knitwear: 'Knit',
  Jacket: 'Jacket',
  Trousers: 'Trousers',
  Jeans: 'Jeans',
  Shoes: 'Shoes',
};

const FALLBACK = {
  type: 'New item',
  cat: 'Shirt',
  colorName: 'Grey',
  fit: 'Regular',
};

export async function tagGarment(photoUri) {
  const item = { photo: photoUri, ...FALLBACK, needsReview: true };

  let pixels;
  try {
    pixels = await loadPixels(photoUri);
  } catch {
    /* Could not even decode the photo — hand back a blank item to edit. */
    item.id = item.id || String(Date.now());
    item.description = describeGarment(item);
    return item;
  }

  try {
    item.colorName = dominantColour(pixels.data, pixels.width, pixels.height).name;
  } catch {
    /* Keep the fallback colour. */
  }

  try {
    const result = await tagImage(pixels.base64);

    const category = result?.category;
    if (category && TYPES.includes(category.label)) {
      item.cat = category.label;
      item.type = CAT_DISPLAY[category.label] ?? category.label;
      item.needsReview = category.confidence < CONFIDENCE_FLOOR;
    }

    const fit = result?.fit;
    if (fit && FITS.includes(fit.label) && fit.confidence >= CONFIDENCE_FLOOR) {
      item.fit = fit.label;
    }
  } catch {
    /* Server down or slow — colour-only, category by hand. */
  }

  item.id = item.id || String(Date.now());
  item.description = describeGarment(item);
  return item;
}
