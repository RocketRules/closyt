import { geminiJson, hasGeminiKey } from '@/lib/gemini';
import { createId } from '@/lib/ids';
import { compressForVision } from '@/lib/image';
import type { Category, FitOrUnknown, Formality, Sleeve, WardrobeItem } from '@/types';
import { CATEGORIES } from '@/types';

type GarmentResponse = {
  label?: string;
  category?: Category;
  subcategory?: string;
  colors?: string[];
  fit?: FitOrUnknown;
  sleeve?: Sleeve;
  pattern?: string;
  formality?: Formality;
  flags?: string[];
  notes?: string;
};

const CLASSIFY_PROMPT = `You classify one clothing item photo for a wardrobe app.
Return JSON only:
{
  "label": string,
  "category": "top" | "bottom" | "outerwear" | "shoes" | "dress" | "accessory",
  "subcategory": string,
  "colors": string[],
  "fit": "fitted" | "regular" | "relaxed" | "unknown",
  "sleeve": "sleeveless" | "short" | "long" | "na",
  "pattern": string,
  "formality": "casual" | "smart-casual" | "formal",
  "flags": string[],
  "notes": string
}
flags must be a subset of: fitted, regular, relaxed, tailored, structured-shoulder, defined-waist, short-jacket, tucked, boxy, oversized, drowning-layers, extra-long, cling, bodycon, cropped, skin-tight, drape, straight, long-hem, open-layer, a-line, mid-rise, show-shape, short-sleeve, long-sleeve, unstructured-blazer, straight-leg, skinny, high-rise, column, hoodie-oversize, tailored-tee
If the photo is not clothes, still pick the closest category and set notes to "unclear item".
label should be 2-4 words, like "White crew tee".`;

function fallbackItem(photoUri: string): WardrobeItem {
  return {
    id: createId('item'),
    photoUri,
    label: 'Closet piece',
    category: 'top',
    subcategory: 'unknown',
    colors: [],
    fit: 'unknown',
    sleeve: 'na',
    pattern: 'solid',
    formality: 'casual',
    flags: [],
    notes: 'Needs a category tap if this looks wrong.',
    classified: false,
  };
}

function normalizeCategory(value: unknown): Category {
  return CATEGORIES.includes(value as Category) ? (value as Category) : 'top';
}

function normalizeFit(value: unknown): FitOrUnknown {
  return value === 'fitted' || value === 'regular' || value === 'relaxed' || value === 'unknown'
    ? value
    : 'unknown';
}

function normalizeSleeve(value: unknown): Sleeve {
  return value === 'sleeveless' || value === 'short' || value === 'long' || value === 'na'
    ? value
    : 'na';
}

function normalizeFormality(value: unknown): Formality {
  return value === 'casual' || value === 'smart-casual' || value === 'formal' ? value : 'casual';
}

export function garmentFromVision(photoUri: string, raw: GarmentResponse): WardrobeItem {
  const category = normalizeCategory(raw.category);
  return {
    id: createId('item'),
    photoUri,
    label: (raw.label || 'Closet piece').slice(0, 40),
    category,
    subcategory: (raw.subcategory || category).slice(0, 40),
    colors: Array.isArray(raw.colors) ? raw.colors.map(String).slice(0, 4) : [],
    fit: normalizeFit(raw.fit),
    sleeve: category === 'top' || category === 'dress' || category === 'outerwear'
      ? normalizeSleeve(raw.sleeve)
      : 'na',
    pattern: (raw.pattern || 'solid').slice(0, 24),
    formality: normalizeFormality(raw.formality),
    flags: Array.isArray(raw.flags) ? raw.flags.map(String).slice(0, 12) : [],
    notes: (raw.notes || '').slice(0, 120),
    classified: true,
  };
}

export async function classifyGarment(photoUri: string): Promise<WardrobeItem> {
  if (!hasGeminiKey()) return fallbackItem(photoUri);
  try {
    const { base64 } = await compressForVision(photoUri);
    const raw = await geminiJson<GarmentResponse>({
      prompt: CLASSIFY_PROMPT,
      imageBase64: base64,
      timeoutMs: 18000,
    });
    return garmentFromVision(photoUri, raw);
  } catch {
    return fallbackItem(photoUri);
  }
}

export async function classifyGarments(photoUris: string[], concurrency = 3): Promise<WardrobeItem[]> {
  const results: WardrobeItem[] = new Array(photoUris.length);
  let next = 0;

  async function worker() {
    while (next < photoUris.length) {
      const index = next;
      next += 1;
      results[index] = await classifyGarment(photoUris[index]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, photoUris.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
