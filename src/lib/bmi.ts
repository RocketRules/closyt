import type { BodyType, HeightUnit, Presentation, SizeBand, WeightUnit } from '@/types';

export function feetInchesToCm(feet: number, inches: number): number {
  return feet * 30.48 + inches * 2.54;
}

export function lbToKg(lb: number): number {
  return lb / 2.2046226218;
}

export function parseHeightCm(input: {
  heightUnit: HeightUnit;
  heightCm: string;
  heightFt: string;
  heightIn: string;
}): number | null {
  if (input.heightUnit === 'cm') {
    const cm = Number(input.heightCm);
    return Number.isFinite(cm) && cm >= 120 && cm <= 230 ? cm : null;
  }
  const ft = Number(input.heightFt);
  const inch = Number(input.heightIn || '0');
  if (!Number.isFinite(ft) || !Number.isFinite(inch) || ft < 4 || ft > 7 || inch < 0 || inch >= 12) {
    return null;
  }
  const cm = feetInchesToCm(ft, inch);
  return cm >= 120 && cm <= 230 ? cm : null;
}

export function parseWeightKg(input: { weightUnit: WeightUnit; weight: string }): number | null {
  const n = Number(input.weight);
  if (!Number.isFinite(n) || n <= 0) return null;
  const kg = input.weightUnit === 'kg' ? n : lbToKg(n);
  return kg >= 35 && kg <= 250 ? kg : null;
}

export function calcBmi(weightKg: number, heightCm: number): number {
  const meters = heightCm / 100;
  if (meters <= 0) return 0;
  return Math.round((weightKg / (meters * meters)) * 10) / 10;
}

export function bodyTypeFromBmi(bmi: number): BodyType {
  if (bmi < 18.5) return 'slim';
  if (bmi < 22) return 'lean';
  if (bmi < 25) return 'average';
  if (bmi < 30) return 'broad';
  return 'plus';
}

export function sizeBandFromMeasurements(
  presentation: Presentation,
  heightCm: number,
  weightKg: number,
): SizeBand {
  const bands: SizeBand[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const cuts =
    presentation === 'womens'
      ? [50, 58, 68, 78, 90]
      : presentation === 'mens'
        ? [60, 70, 82, 95, 110]
        : [55, 64, 75, 88, 102];

  let index = cuts.findIndex((cut) => weightKg < cut);
  if (index === -1) index = bands.length - 1;

  if (heightCm >= 185 && index < bands.length - 1) index += 1;
  if (heightCm <= 155 && index > 0) index -= 1;

  return bands[index];
}
