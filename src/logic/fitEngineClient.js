/*
 * HTTP client for the fit-scoring engine (POST /rank_outfits).
 *
 * Base URL comes from EXPO_PUBLIC_FIT_ENGINE_URL (default localhost:8000).
 * Fails hard with a clear error — no silent fallback.
 */

const BASE =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_FIT_ENGINE_URL) ||
  'http://127.0.0.1:8000';

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
