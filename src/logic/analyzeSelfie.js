/*
 * Selfie analysis via Gemini Vision.
 *
 * Sends the onboarding photo(s) to Gemini for a body-build and vibe check.
 * Returns vision signals that mergeBodyProfile uses to refine the body type
 * (e.g., override BMI "average" → "athletic" when muscle definition is visible).
 *
 * Ported from srianeesh-bodyprofile branch (TS → JS).
 */

import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { geminiJson, hasGeminiKey } from './gemini';

const EMPTY_VISION = {
  visibleTorso: false,
  athleticCue: 'low',
  clothingVibe: '',
  colors: [],
  confidence: 'low',
};

async function compressForVision(uri) {
  const result = await manipulateAsync(uri, [{ resize: { width: 1024 } }], {
    compress: 0.72,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!result.base64) throw new Error('Could not read image data');
  return { uri: result.uri, base64: result.base64 };
}

const SELFIE_PROMPT = `You analyze one casual selfie for a clothing app.
Return JSON only with this shape:
{
  "visibleTorso": boolean,
  "buildGuess": "slim" | "lean" | "average" | "athletic" | "broad" | "plus",
  "athleticCue": "low" | "medium" | "high",
  "clothingVibe": string,
  "colors": string[],
  "confidence": "low" | "medium" | "high",
  "notes": string
}
Rules:
- Do not diagnose health, BMI, or body fat percentage.
- If you mostly see a face, set visibleTorso to false and confidence to "low".
- athleticCue is high only if muscle definition is clearly visible on the torso.
- colors are the main colors in the photo (skin/hair/clothes), short lowercase names.
- Keep notes to one short sentence.`;

export async function analyzeSelfie(imageUri) {
  if (!hasGeminiKey()) return EMPTY_VISION;
  try {
    const { base64 } = await compressForVision(imageUri);
    const raw = await geminiJson({
      prompt: SELFIE_PROMPT,
      imageBase64: base64,
      timeoutMs: 18000,
    });
    const cue = raw.athleticCue === 'high' || raw.athleticCue === 'medium' ? raw.athleticCue : 'low';
    const confidence =
      raw.confidence === 'high' || raw.confidence === 'medium' || raw.confidence === 'low'
        ? raw.confidence
        : 'low';
    return {
      visibleTorso: Boolean(raw.visibleTorso),
      athleticCue: cue,
      clothingVibe: (raw.clothingVibe ?? '').slice(0, 80),
      colors: Array.isArray(raw.colors) ? raw.colors.map(String).slice(0, 6) : [],
      confidence: raw.visibleTorso ? confidence : 'low',
    };
  } catch (e) {
    console.warn('analyzeSelfie failed:', e.message);
    return EMPTY_VISION;
  }
}

export { EMPTY_VISION };
