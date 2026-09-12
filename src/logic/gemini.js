/*
 * Gemini API client — model-cascading, JSON extraction, vision support.
 *
 * Ported from srianeesh-bodyprofile branch (TS → JS for Expo Go).
 * Tries gemini-2.5-flash-lite first, then falls through faster/cheaper models.
 */

const DEFAULT_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
];

export function getGeminiApiKey() {
  const key =
    typeof process !== 'undefined'
      ? process.env?.EXPO_PUBLIC_GEMINI_API_KEY?.trim()
      : null;
  return key || null;
}

export function hasGeminiKey() {
  return Boolean(getGeminiApiKey());
}

function extractText(payload) {
  if (payload?.error?.message) {
    throw new Error(payload.error.message);
  }
  return (
    payload?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? '')
      .join('\n')
      .trim() ?? ''
  );
}

export function extractJson(raw) {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const start = candidate.indexOf('{');
  const arrayStart = candidate.indexOf('[');
  let jsonText = candidate;
  if (start >= 0 && (arrayStart < 0 || start < arrayStart)) {
    jsonText = candidate.slice(start);
  } else if (arrayStart >= 0) {
    jsonText = candidate.slice(arrayStart);
  }
  return JSON.parse(jsonText);
}

async function generateOnce({ model, apiKey, prompt, imageBase64, mimeType, timeoutMs }) {
  const parts = [];
  if (imageBase64) {
    parts.push({
      inline_data: {
        mime_type: mimeType ?? 'image/jpeg',
        data: imageBase64,
      },
    });
  }
  parts.push({ text: prompt });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg = payload?.error?.message ?? `Gemini ${response.status}`;
      const err = new Error(msg);
      err.status = response.status;
      throw err;
    }
    return extractText(payload);
  } finally {
    clearTimeout(timer);
  }
}

export async function geminiJson({ prompt, imageBase64, mimeType, timeoutMs = 20000 }) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY');

  const envModel =
    typeof process !== 'undefined'
      ? process.env?.EXPO_PUBLIC_GEMINI_MODEL
      : null;
  const models = envModel ? [envModel, ...DEFAULT_MODELS] : DEFAULT_MODELS;
  const unique = [...new Set(models)];

  let lastError;
  for (const model of unique) {
    try {
      const text = await generateOnce({ model, apiKey, prompt, imageBase64, mimeType, timeoutMs });
      return extractJson(text);
    } catch (err) {
      lastError = err;
      if (err.status && err.status !== 404 && err.status !== 429) throw err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Gemini request failed');
}
