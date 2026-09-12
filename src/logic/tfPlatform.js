/*
 * Registering TensorFlow.js against React Native.
 *
 * tfjs-core picks a "platform" by sniffing the environment. In React Native it
 * guesses browser, whose implementation leans on TextEncoder and a
 * window.postMessage scheduling trick — neither of which behaves in Hermes.
 * Rather than depend on that guess, we register the whole (small) Platform
 * interface ourselves: fetch, now, encode, decode, isTypedArray.
 *
 * Doing this is also what keeps us clear of @tensorflow/tfjs-react-native,
 * which needs react-native-fs — native code, so unusable in Expo Go.
 */

import * as tf from '@tensorflow/tfjs-core';

/* Hand-rolled UTF-8 so we never touch TextEncoder/TextDecoder. */
function encodeUtf8(text) {
  const out = [];
  for (let i = 0; i < text.length; i++) {
    let c = text.charCodeAt(i);
    if (c < 0x80) {
      out.push(c);
    } else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length) {
      /* Surrogate pair -> one code point. */
      const next = text.charCodeAt(i + 1);
      c = 0x10000 + ((c - 0xd800) << 10) + (next - 0xdc00);
      i++;
      out.push(
        0xf0 | (c >> 18),
        0x80 | ((c >> 12) & 0x3f),
        0x80 | ((c >> 6) & 0x3f),
        0x80 | (c & 0x3f)
      );
    } else {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return new Uint8Array(out);
}

function decodeUtf8(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    if (b < 0x80) {
      out += String.fromCharCode(b);
      i += 1;
    } else if (b < 0xe0) {
      out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
      i += 2;
    } else if (b < 0xf0) {
      out += String.fromCharCode(
        ((b & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f)
      );
      i += 3;
    } else {
      const cp =
        ((b & 0x07) << 18) |
        ((bytes[i + 1] & 0x3f) << 12) |
        ((bytes[i + 2] & 0x3f) << 6) |
        (bytes[i + 3] & 0x3f);
      const v = cp - 0x10000;
      out += String.fromCharCode(0xd800 + (v >> 10), 0xdc00 + (v & 0x3ff));
      i += 4;
    }
  }
  return out;
}

class ReactNativePlatform {
  fetch(path, init) {
    return fetch(path, init);
  }

  now() {
    return Date.now();
  }

  encode(text, encoding) {
    if (encoding !== 'utf-8' && encoding !== 'utf8') {
      throw new Error(`tfjs platform: unsupported encoding ${encoding}`);
    }
    return encodeUtf8(text);
  }

  decode(bytes, encoding) {
    if (encoding !== 'utf-8' && encoding !== 'utf8') {
      throw new Error(`tfjs platform: unsupported encoding ${encoding}`);
    }
    return decodeUtf8(bytes);
  }

  isTypedArray(a) {
    return (
      a instanceof Float32Array ||
      a instanceof Int32Array ||
      a instanceof Uint8Array ||
      a instanceof Uint8ClampedArray
    );
  }
}

let registered = false;

export function registerTfPlatform() {
  if (registered) return;
  tf.setPlatform('react-native', new ReactNativePlatform());
  registered = true;
}
