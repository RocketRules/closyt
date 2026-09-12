import { geminiJson, hasGeminiKey } from '@/lib/gemini';
import { compressForVision } from '@/lib/image';
import { mergeBodyProfile } from '@/lib/mergeProfile';
import type { AthleticCue, BodyProfile, Confidence, Presentation, VisionSignals } from '@/types';
import { EMPTY_VISION } from '@/types';

type VisionResponse = {
  visibleTorso?: boolean;
  buildGuess?: string;
  athleticCue?: AthleticCue;
  clothingVibe?: string;
  colors?: string[];
  confidence?: Confidence;
  notes?: string;
};

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

export async function analyzeSelfie(imageUri: string): Promise<VisionSignals> {
  if (!hasGeminiKey()) return EMPTY_VISION;
  try {
    const { base64 } = await compressForVision(imageUri);
    const raw = await geminiJson<VisionResponse>({
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
  } catch {
    return EMPTY_VISION;
  }
}

export async function buildBodyProfile(input: {
  presentation: Presentation;
  heightCm: number;
  weightKg: number;
  selfieUri?: string | null;
}): Promise<BodyProfile> {
  const vision = input.selfieUri ? await analyzeSelfie(input.selfieUri) : EMPTY_VISION;
  return mergeBodyProfile({
    presentation: input.presentation,
    heightCm: input.heightCm,
    weightKg: input.weightKg,
    vision,
  });
}
