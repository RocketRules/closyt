/*
 * Garment category classifier.
 *
 * Runs a TensorFlow.js model trained off-device (Teachable Machine or Keras +
 * tensorflowjs_converter) entirely on the phone, in pure JavaScript, inside
 * Expo Go. The CPU backend is deliberate: the WebGL backend needs expo-gl and
 * the usual RN bindings need react-native-fs, and native modules cannot load
 * in Expo Go.
 *
 * Until a model is dropped into assets/model/, `classify` returns null and the
 * app falls back to manual tagging — the placeholder files there keep Metro
 * happy without pretending to be a network.
 */

import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-cpu';
import { loadLayersModel } from '@tensorflow/tfjs-layers';
import { Asset } from 'expo-asset';

import { registerTfPlatform } from './tfPlatform';
import { TYPES } from '../theme/theme';

const modelJSON = require('../../assets/model/model.json');
const metadata = require('../../assets/model/metadata.json');
const weightsModule = require('../../assets/model/weights.bin');

/* Teachable Machine's MobileNet export: 224px square, inputs scaled to [-1,1]. */
const INPUT_SIZE = 224;
const CONFIDENCE_FLOOR = 0.6;

export const hasModel = () => modelJSON?.closytPlaceholder !== true;

/*
 * tfjs normally fetches a model over HTTP. Ours is bundled, so we hand it the
 * pieces directly — this is the part @tensorflow/tfjs-react-native would have
 * provided as bundleResourceIO.
 */
function bundledIO(json, weightData) {
  return {
    load: async () => ({
      modelTopology: json.modelTopology,
      weightSpecs: json.weightsManifest.flatMap((group) => group.weights),
      weightData,
      format: json.format,
      generatedBy: json.generatedBy,
      convertedBy: json.convertedBy,
    }),
  };
}

async function fetchWeights() {
  const asset = Asset.fromModule(weightsModule);
  /*
   * In Expo Go the asset is served by Metro over http; in a built app it is a
   * local file. Try the downloaded copy first and fall back to the remote uri.
   */
  try {
    await asset.downloadAsync();
  } catch {
    /* Not fatal — asset.uri may still be fetchable. */
  }
  const candidates = [asset.localUri, asset.uri].filter(Boolean);
  let lastError;
  for (const uri of candidates) {
    try {
      const res = await fetch(uri);
      return await res.arrayBuffer();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('could not read model weights');
}

/* Labels come from the training export so they cannot drift from the model. */
function labels() {
  const fromMetadata = metadata?.labels;
  if (Array.isArray(fromMetadata) && fromMetadata.length) return fromMetadata;
  return TYPES;
}

let modelPromise = null;

/* Loading is expensive, so do it once and share the promise. */
function getModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      registerTfPlatform();
      await tf.setBackend('cpu');
      await tf.ready();
      const weights = await fetchWeights();
      return loadLayersModel(bundledIO(modelJSON, weights));
    })().catch((err) => {
      /* Let the next call retry rather than caching the failure forever. */
      modelPromise = null;
      throw err;
    });
  }
  return modelPromise;
}

/* Warm the model up ahead of the first photo so capture feels instant. */
export function preloadClassifier() {
  if (!hasModel()) return;
  getModel().catch(() => {});
}

/*
 * Classify a decoded RGBA buffer.
 * Returns { label, confidence } or null when no model is available.
 */
export async function classify(pixels, width, height) {
  if (!hasModel()) return null;

  const model = await getModel();
  const names = labels();

  const input = tf.tidy(() => {
    /* RGBA -> RGB float, scaled to [-1, 1]. */
    const rgb = new Float32Array(INPUT_SIZE * INPUT_SIZE * 3);
    for (let y = 0; y < INPUT_SIZE; y++) {
      /* Nearest-neighbour sample in case the decode came back a little off. */
      const sy = Math.min(height - 1, Math.floor((y * height) / INPUT_SIZE));
      for (let x = 0; x < INPUT_SIZE; x++) {
        const sx = Math.min(width - 1, Math.floor((x * width) / INPUT_SIZE));
        const src = (sy * width + sx) * 4;
        const dst = (y * INPUT_SIZE + x) * 3;
        rgb[dst] = pixels[src] / 127.5 - 1;
        rgb[dst + 1] = pixels[src + 1] / 127.5 - 1;
        rgb[dst + 2] = pixels[src + 2] / 127.5 - 1;
      }
    }
    return tf.tensor4d(rgb, [1, INPUT_SIZE, INPUT_SIZE, 3]);
  });

  try {
    const output = model.predict(input);
    const scores = await output.data();
    output.dispose();

    let bestIndex = 0;
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] > scores[bestIndex]) bestIndex = i;
    }
    return {
      label: names[bestIndex] ?? null,
      confidence: scores[bestIndex],
      confident: scores[bestIndex] >= CONFIDENCE_FLOOR,
    };
  } finally {
    input.dispose();
  }
}
