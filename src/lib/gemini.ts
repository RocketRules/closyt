const DEFAULT_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
];

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

export function getGeminiApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim();
  return key ? key : null;
}

export function hasGeminiKey(): boolean {
  return Boolean(getGeminiApiKey());
}

type GeminiPart = { text?: string; inline_data?: { mime_type: string; data: string } };

function extractText(payload: unknown): string {
  const data = payload as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    error?: { message?: string };
  };
  if (data.error?.message) {
    throw new GeminiError(data.error.message);
  }
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('\n') ?? '';
  return text.trim();
}

export function extractJson<T>(raw: string): T {
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
  return JSON.parse(jsonText) as T;
}

async function generateOnce(args: {
  model: string;
  apiKey: string;
  prompt: string;
  imageBase64?: string;
  mimeType?: string;
  timeoutMs: number;
}): Promise<string> {
  const parts: GeminiPart[] = [];
  if (args.imageBase64) {
    parts.push({
      inline_data: {
        mime_type: args.mimeType ?? 'image/jpeg',
        data: args.imageBase64,
      },
    });
  }
  parts.push({ text: args.prompt });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), args.timeoutMs);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${args.model}:generateContent?key=${encodeURIComponent(args.apiKey)}`,
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
      const message =
        (payload as { error?: { message?: string } }).error?.message ??
        `Gemini ${response.status}`;
      throw new GeminiError(message, response.status);
    }
    return extractText(payload);
  } finally {
    clearTimeout(timer);
  }
}

export async function geminiJson<T>(args: {
  prompt: string;
  imageBase64?: string;
  mimeType?: string;
  timeoutMs?: number;
}): Promise<T> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new GeminiError('Missing EXPO_PUBLIC_GEMINI_API_KEY');
  }

  const models = process.env.EXPO_PUBLIC_GEMINI_MODEL
    ? [process.env.EXPO_PUBLIC_GEMINI_MODEL, ...DEFAULT_MODELS]
    : DEFAULT_MODELS;
  const uniqueModels = [...new Set(models)];
  const timeoutMs = args.timeoutMs ?? 20000;

  let lastError: unknown;
  for (const model of uniqueModels) {
    try {
      const text = await generateOnce({
        model,
        apiKey,
        prompt: args.prompt,
        imageBase64: args.imageBase64,
        mimeType: args.mimeType,
        timeoutMs,
      });
      return extractJson<T>(text);
    } catch (error) {
      lastError = error;
      const status = error instanceof GeminiError ? error.status : undefined;
      if (status && status !== 404 && status !== 429) {
        throw error;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new GeminiError('Gemini request failed');
}
