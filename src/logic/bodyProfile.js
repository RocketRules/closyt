/*
 * Body profile: BMI, body type, size band, and style constraints.
 *
 * Ported from srianeesh-bodyprofile (TS → plain JS for Expo Go / bare RN).
 * Body-type labels are internal only — never surface them in the UI.
 */

/* ---------- BMI / body type ---------- */

export function calcBmi(weightKg, heightCm) {
  const m = heightCm / 100;
  if (m <= 0) return 0;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export function bodyTypeFromBmi(bmi) {
  if (bmi < 18.5) return 'slim';
  if (bmi < 22) return 'lean';
  if (bmi < 25) return 'average';
  if (bmi < 30) return 'broad';
  return 'plus';
}

/* ---------- Size band ---------- */

export function sizeBandFromMeasurements(presentation, heightCm, weightKg) {
  const bands = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
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

/* ---------- Style constraints ---------- */

const SHARED = {
  slim: {
    fitBias: 'fitted',
    prefer: ['fitted', 'tailored', 'structured-shoulder', 'defined-waist', 'short-jacket'],
    avoid: ['boxy', 'oversized', 'drowning-layers', 'extra-long'],
  },
  lean: {
    fitBias: 'fitted',
    prefer: ['fitted', 'tailored', 'defined-waist', 'tucked', 'structured-shoulder'],
    avoid: ['boxy', 'oversized', 'cling'],
  },
  average: {
    fitBias: 'regular',
    prefer: ['regular', 'tailored', 'balanced', 'straight'],
    avoid: ['bodycon', 'drowning-layers'],
  },
  athletic: {
    fitBias: 'fitted',
    prefer: ['tailored', 'show-shape', 'short-sleeve', 'structured-shoulder'],
    avoid: ['boxy', 'extra-long', 'drowning-layers'],
  },
  broad: {
    fitBias: 'relaxed',
    prefer: ['relaxed', 'drape', 'straight', 'long-hem', 'open-layer'],
    avoid: ['cling', 'bodycon', 'cropped', 'skin-tight'],
  },
  plus: {
    fitBias: 'relaxed',
    prefer: ['drape', 'structured', 'a-line', 'straight', 'long-hem', 'mid-rise'],
    avoid: ['cling', 'bodycon', 'skin-tight', 'cropped'],
  },
};

const PRES_EXTRA = {
  mens: {
    slim: { prefer: ['structured-shoulder', 'shorter-jacket'], avoid: ['boxy'] },
    athletic: { prefer: ['tailored-tee'], avoid: ['hoodie-oversize'] },
    plus: { prefer: ['unstructured-blazer', 'straight-leg'], avoid: ['skinny'] },
  },
  womens: {
    slim: { prefer: ['defined-waist', 'high-rise'], avoid: ['oversized'] },
    lean: { prefer: ['defined-waist', 'column'], avoid: ['cling'] },
    plus: { prefer: ['a-line', 'drape', 'mid-rise'], avoid: ['bodycon', 'cling'] },
    athletic: { prefer: ['show-shape', 'straight'], avoid: ['bodycon'] },
  },
  unisex: {
    slim: { prefer: ['tailored'], avoid: ['boxy'] },
    plus: { prefer: ['drape', 'straight'], avoid: ['cling'] },
  },
};

function unique(arr) {
  return [...new Set(arr)];
}

export function constraintsFor(presentation, bodyType) {
  const pres = presentation === 'Woman' || presentation === 'womens' ? 'womens'
    : presentation === 'Man' || presentation === 'mens' ? 'mens'
    : 'unisex';
  const base = SHARED[bodyType] || SHARED.average;
  const extra = (PRES_EXTRA[pres] || {})[bodyType] || {};
  return {
    fitBias: base.fitBias,
    prefer: unique([...base.prefer, ...(extra.prefer || [])]),
    avoid: unique([...base.avoid, ...(extra.avoid || [])]),
  };
}

/* ---------- Merge profile ---------- */

/**
 * Build an internal body profile from onboarding data.
 * Never returns body-type labels to the UI — they stay internal only.
 *
 * If vision signals are provided (from Gemini selfie analysis), they can
 * override the BMI-based body type (e.g., average → athletic when muscle
 * definition is visible).
 */
export function mergeBodyProfile({ gender, age, height, weight, hUnit, wUnit }, vision) {
  const heightCm = hUnit === 'ft/in' ? height : height;
  const weightKg = wUnit === 'lb' ? weight / 2.2046 : weight;
  const bmi = calcBmi(weightKg, heightCm);
  let bodyType = bodyTypeFromBmi(bmi);

  /* Vision override: if selfie shows visible torso with athletic build,
     upgrade average/broad → athletic (matches srianeesh-bodyprofile logic). */
  if (
    vision &&
    vision.visibleTorso &&
    vision.athleticCue === 'high' &&
    (bodyType === 'average' || bodyType === 'broad')
  ) {
    bodyType = 'athletic';
  }

  const presentation =
    gender === 'Woman' ? 'womens' : gender === 'Man' ? 'mens' : 'unisex';

  const style = constraintsFor(presentation, bodyType);

  return {
    presentation,
    heightCm: Math.round(heightCm),
    weightKg: Math.round(weightKg * 10) / 10,
    age: age || 25,
    gender,
    bmi,
    bodyType,
    sizeBand: sizeBandFromMeasurements(presentation, heightCm, weightKg),
    fitBias: style.fitBias,
    prefer: style.prefer,
    avoid: style.avoid,
    vision: vision || null,
  };
}
