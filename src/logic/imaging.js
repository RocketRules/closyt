/*
 * Turning a photo into pixels.
 *
 * Colour detection needs an RGBA buffer; the FashionCLIP server needs a small
 * JPEG. One resize produces both, so the photo is only processed once.
 *
 * Downscaling first is not optional — a full-resolution phone photo is
 * ~12 megapixels, and decoding that in pure JavaScript would stall the UI
 * thread for seconds and risk running the device out of memory.
 */

import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { decode as decodeJpeg } from 'jpeg-js';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/* Node's Buffer does not exist in React Native, and this is all we needed it for. */
function base64ToBytes(b64) {
  const lookup = new Uint8Array(256);
  for (let i = 0; i < B64.length; i++) lookup[B64.charCodeAt(i)] = i;

  let len = b64.length;
  while (len > 0 && b64[len - 1] === '=') len--;

  const bytes = new Uint8Array((len * 3) >> 2);
  let p = 0;
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < len; i++) {
    buffer = (buffer << 6) | lookup[b64.charCodeAt(i)];
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[p++] = (buffer >> bits) & 0xff;
    }
  }
  return bytes;
}

/*
 * Resize to `size` square and decode to RGBA.
 * 224px is CLIP's native input, so the same bytes serve the server and the
 * colour detector, and the upload stays ~15KB.
 * Returns { data: Uint8Array (RGBA), width, height, base64 }.
 */
export async function loadPixels(uri, size = 224) {
  const result = await manipulateAsync(uri, [{ resize: { width: size, height: size } }], {
    base64: true,
    compress: 0.9,
    format: SaveFormat.JPEG,
  });

  if (!result.base64) throw new Error('image resize returned no data');

  const bytes = base64ToBytes(result.base64);
  /* useTArray keeps jpeg-js on typed arrays instead of allocating a Buffer. */
  const raw = decodeJpeg(bytes, { useTArray: true, formatAsRGBA: true });

  return {
    data: raw.data,
    width: raw.width,
    height: raw.height,
    base64: result.base64,
    uri: result.uri,
  };
}
