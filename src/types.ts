export type Presentation = 'mens' | 'womens' | 'unisex';
export type BodyType = 'slim' | 'lean' | 'average' | 'athletic' | 'broad' | 'plus';
export type SizeBand = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
export type Fit = 'fitted' | 'regular' | 'relaxed';
export type FitOrUnknown = Fit | 'unknown';
export type Confidence = 'low' | 'medium' | 'high';
export type AthleticCue = 'low' | 'medium' | 'high';
export type HeightUnit = 'cm' | 'ft';
export type WeightUnit = 'kg' | 'lb';
export type Category = 'top' | 'bottom' | 'outerwear' | 'shoes' | 'dress' | 'accessory';
export type Formality = 'casual' | 'smart-casual' | 'formal';
export type Sleeve = 'sleeveless' | 'short' | 'long' | 'na';
export type Occasion = 'everyday' | 'casual' | 'office' | 'night';

export const CATEGORIES: Category[] = [
  'top',
  'bottom',
  'outerwear',
  'shoes',
  'dress',
  'accessory',
];

export const BODY_TYPES: BodyType[] = ['slim', 'lean', 'average', 'athletic', 'broad', 'plus'];

export type VisionSignals = {
  visibleTorso: boolean;
  athleticCue: AthleticCue;
  clothingVibe: string;
  colors: string[];
  confidence: Confidence;
};

export type BodyProfile = {
  presentation: Presentation;
  heightCm: number;
  weightKg: number;
  bmi: number;
  bodyType: BodyType;
  sizeBand: SizeBand;
  fitBias: Fit;
  prefer: string[];
  avoid: string[];
  vision: VisionSignals;
};

export type WardrobeItem = {
  id: string;
  photoUri: string;
  label: string;
  category: Category;
  subcategory: string;
  colors: string[];
  fit: FitOrUnknown;
  sleeve: Sleeve;
  pattern: string;
  formality: Formality;
  flags: string[];
  notes: string;
  classified: boolean;
  seeded?: boolean;
};

export type Outfit = {
  id: string;
  itemIds: string[];
  title: string;
  occasion: Occasion;
  why: string;
  fallback: boolean;
};

export type OnboardingDraft = {
  presentation: Presentation | null;
  heightUnit: HeightUnit;
  weightUnit: WeightUnit;
  heightCm: string;
  heightFt: string;
  heightIn: string;
  weight: string;
  selfieUri: string | null;
};

export const EMPTY_VISION: VisionSignals = {
  visibleTorso: false,
  athleticCue: 'low',
  clothingVibe: '',
  colors: [],
  confidence: 'low',
};

export const MAX_WARDROBE = 15;
