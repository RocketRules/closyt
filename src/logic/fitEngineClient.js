/*
 * HTTP client for the fit-scoring engine (POST /rank_outfits, /suggest_pieces).
 *
 * On native (Expo Go), auto-discovers the laptop's IP from the Metro connection,
 * just like the tagger does. Falls back to EXPO_PUBLIC_FIT_ENGINE_URL or localhost.
 */

import Constants from 'expo-constants';

const PORT = 8000;

function fitEngineBaseUrl() {
  /* Explicit override from .env always wins. */
  const envUrl =
    typeof process !== 'undefined'
      ? process.env?.EXPO_PUBLIC_FIT_ENGINE_URL?.trim()
      : null;
  if (envUrl) return envUrl.replace(/\/$/, '');

  /* Auto-discover from Expo's Metro connection (same host as the dev server). */
  const hostUri =
    Constants?.expoConfig?.hostUri ||
    Constants?.expoGoConfig?.debuggerHost ||
    Constants?.manifest2?.extra?.expoGo?.debuggerHost;

  const host = hostUri?.split('://').pop()?.split(':')[0];
  if (host) return `http://${host}:${PORT}`;

  return `http://127.0.0.1:${PORT}`;
}

const BASE = fitEngineBaseUrl();

export async function rankOutfits(rankRequest) {
  const url = `${BASE}/rank_outfits`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rankRequest),
  });

  if (!resp.ok) {
    let detail = `Engine returned ${resp.status}`;
    try {
      const body = await resp.json();
      if (body.detail) detail = body.detail;
    } catch { /* ignore */ }
    throw new Error(detail);
  }

  return resp.json();
}

export async function healthCheck() {
  try {
    const resp = await fetch(`${BASE}/health`, { method: 'GET' });
    if (!resp.ok) return { ok: false, detail: `status ${resp.status}` };
    return { ok: true, ...(await resp.json()) };
  } catch (err) {
    return { ok: false, detail: err.message };
  }
}

export async function suggestPieces(rankRequest) {
  const url = `${BASE}/suggest_pieces`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rankRequest),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.suggestions || [];
  } catch {
    return [];
  }
}
