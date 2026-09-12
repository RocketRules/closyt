import type { BodyType, Fit, Presentation } from '@/types';

export type StyleConstraints = {
  fitBias: Fit;
  prefer: string[];
  avoid: string[];
};

const SHARED: Record<BodyType, StyleConstraints> = {
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

const PRESENTATION_EXTRA: Record<Presentation, Partial<Record<BodyType, { prefer?: string[]; avoid?: string[] }>>> =
  {
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

export function constraintsFor(
  presentation: Presentation,
  bodyType: BodyType,
): StyleConstraints {
  const base = SHARED[bodyType];
  const extra = PRESENTATION_EXTRA[presentation][bodyType];
  return {
    fitBias: base.fitBias,
    prefer: unique([...base.prefer, ...(extra?.prefer ?? [])]),
    avoid: unique([...base.avoid, ...(extra?.avoid ?? [])]),
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
