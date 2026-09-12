/*
 * Garment tagging.
 *
 * Decodes the photo once, then reads two things from it:
 *  - colour, by pixel maths against the app's ten-colour palette (colour.js)
 *  - category, from an on-device TensorFlow.js model (classifier.js)
 *
 * Fit stays manual. A category-labelled dataset cannot supervise it, and
 * guessing it would be worse than the one tap it costs in the tag editor.
 *
 * Anything that fails here degrades rather than throws: the caller always gets
 * a usable item, flagged `needsReview` so the editor opens on it.
 */

import { loadPixels } from './imaging';
import { dominantColour } from './colour';
import { classify } from './classifier';
import { TYPES } from '../theme/theme';

/* Display names read better than the bare category. */
const DISPLAY = {
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
  colorName: 'Oatmeal',
  fit: 'Regular',
};

export async function tagGarment(photoUri) {
  const item = { photo: photoUri, ...FALLBACK, needsReview: true };

  let pixels;
  try {
    pixels = await loadPixels(photoUri);
  } catch {
    /* Could not even decode the photo — hand back the blank item to edit. */
    return item;
  }

  try {
    item.colorName = dominantColour(pixels.data, pixels.width, pixels.height).name;
  } catch {
    /* Keep the fallback colour. */
  }

  try {
    const guess = await classify(pixels.data, pixels.width, pixels.height);
    if (guess && TYPES.includes(guess.label)) {
      item.cat = guess.label;
      item.type = DISPLAY[guess.label] ?? guess.label;
      /* Only skip the review prompt when the model is actually sure. */
      item.needsReview = !guess.confident;
    }
  } catch {
    /* No model bundled yet, or inference failed — manual category it is. */
  }

  return item;
}
