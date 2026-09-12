/*
 * Client for the FashionCLIP tagger in server/.
 *
 * The server address is derived from the Metro connection the app is already
 * using, so there is no IP to configure: if Expo Go reached the dev server,
 * it can reach the tagger on the same host. An explicit override is available
 * via `extra.taggerUrl` in app.json for anything unusual.
 *
 * Every failure here is non-fatal. If the server is down the app falls back to
 * colour-only tagging and the user picks the category in the editor.
 */

import Constants from 'expo-constants';

const PORT = 8001;
const TIMEOUT_MS = 15000;

export function taggerBaseUrl() {
  const override = Constants.expoConfig?.extra?.taggerUrl;
  if (override) return override.replace(/\/$/, '');

  /* e.g. "192.168.1.24:8081" — the machine running Metro is the one to ask. */
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost;

  const host = hostUri?.split('://').pop()?.split(':')[0];
  if (!host) return null;
  return `http://${host}:${PORT}`;
}

async function post(path, body, timeout = TIMEOUT_MS) {
  const base = taggerBaseUrl();
  if (!base) throw new Error('no tagger host — is the app running through Expo Go?');

  /* React Native's fetch has no timeout of its own; without this a dead
   * server leaves the capture button spinning indefinitely. */
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(base + path, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`tagger responded ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/* Is the model loaded and reachable? Used to warm up and to report status. */
export async function taggerReady() {
  try {
    const res = await post('/health', null, 4000);
    return !!res?.ok;
  } catch {
    return false;
  }
}

/*
 * Ask the server what the garment is.
 * Returns { category: {label, confidence}, fit: {label, confidence} }.
 */
export function tagImage(base64Jpeg) {
  return post('/tag', { image: base64Jpeg });
}
