import { bodyTypeFromBmi, calcBmi, sizeBandFromMeasurements } from '@/lib/bmi';
import { constraintsFor } from '@/lib/styleConstraints';
import type { BodyProfile, BodyType, Presentation, VisionSignals } from '@/types';
import { EMPTY_VISION } from '@/types';

export function mergeBodyProfile(input: {
  presentation: Presentation;
  heightCm: number;
  weightKg: number;
  vision?: VisionSignals | null;
}): BodyProfile {
  const bmi = calcBmi(input.weightKg, input.heightCm);
  const vision = input.vision ?? EMPTY_VISION;
  let bodyType: BodyType = bodyTypeFromBmi(bmi);

  if (
    vision.visibleTorso &&
    vision.athleticCue === 'high' &&
    (bodyType === 'average' || bodyType === 'broad')
  ) {
    bodyType = 'athletic';
  }

  const style = constraintsFor(input.presentation, bodyType);

  return {
    presentation: input.presentation,
    heightCm: Math.round(input.heightCm),
    weightKg: Math.round(input.weightKg * 10) / 10,
    bmi,
    bodyType,
    sizeBand: sizeBandFromMeasurements(input.presentation, input.heightCm, input.weightKg),
    fitBias: style.fitBias,
    prefer: style.prefer,
    avoid: style.avoid,
    vision,
  };
}
