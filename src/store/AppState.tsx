import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { demoWardrobeItems } from '@/data/demoWardrobe';
import { buildBodyProfile } from '@/lib/analyzeSelfie';
import { parseHeightCm, parseWeightKg } from '@/lib/bmi';
import { classifyGarments } from '@/lib/classifyGarment';
import { composeOutfits } from '@/lib/outfitAgent';
import { canComposeOutfits } from '@/lib/wardrobeFilter';
import type {
  BodyProfile,
  Category,
  OnboardingDraft,
  Outfit,
  WardrobeItem,
} from '@/types';
import { CATEGORIES, MAX_WARDROBE } from '@/types';

const STORAGE_KEY = '@closyt/state';

const DEFAULT_DRAFT: OnboardingDraft = {
  presentation: null,
  heightUnit: 'ft',
  weightUnit: 'lb',
  heightCm: '170',
  heightFt: '5',
  heightIn: '8',
  weight: '150',
  selfieUri: null,
};

type Persisted = {
  draft?: OnboardingDraft;
  profile?: BodyProfile | null;
  wardrobe?: WardrobeItem[];
};

type AppContextValue = {
  draft: OnboardingDraft;
  setDraft: (patch: Partial<OnboardingDraft>) => void;
  profile: BodyProfile | null;
  wardrobe: WardrobeItem[];
  outfits: Outfit[];
  outfitsSource: 'agent' | 'fallback' | null;
  buildingProfile: boolean;
  classifying: boolean;
  composing: boolean;
  error: string | null;
  measurementError: string | null;
  parsedMeasurements: { heightCm: number; weightKg: number } | null;
  canCompose: boolean;
  buildProfileFromDraft: (opts?: { selfieUri?: string | null }) => Promise<BodyProfile | null>;
  addClosetPhotos: (uris: string[]) => Promise<void>;
  loadDemoCloset: () => void;
  removeItem: (id: string) => void;
  cycleCategory: (id: string) => void;
  composeLooks: () => Promise<boolean>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<OnboardingDraft>(DEFAULT_DRAFT);
  const [profile, setProfile] = useState<BodyProfile | null>(null);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [outfitsSource, setOutfitsSource] = useState<'agent' | 'fallback' | null>(null);
  const [buildingProfile, setBuildingProfile] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [composing, setComposing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw || cancelled) return;
        const parsed = JSON.parse(raw) as Persisted;
        if (parsed.draft) setDraftState({ ...DEFAULT_DRAFT, ...parsed.draft });
        if (parsed.profile) setProfile(parsed.profile);
        if (parsed.wardrobe?.length) setWardrobe(parsed.wardrobe);
      } catch {
        // ignore corrupt cache
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ draft, profile, wardrobe } satisfies Persisted),
    );
  }, [draft, profile, wardrobe, hydrated]);

  const setDraft = useCallback((patch: Partial<OnboardingDraft>) => {
    setDraftState((prev) => ({ ...prev, ...patch }));
  }, []);

  const parsedMeasurements = useMemo(() => {
    if (!draft.presentation) return null;
    const heightCm = parseHeightCm(draft);
    const weightKg = parseWeightKg(draft);
    if (heightCm == null || weightKg == null) return null;
    return { heightCm, weightKg };
  }, [draft]);

  const measurementError = useMemo(() => {
    if (draft.heightUnit === 'cm' && draft.heightCm && parseHeightCm(draft) == null) {
      return 'Height should be between 120 and 230 cm.';
    }
    if (draft.heightUnit === 'ft' && (draft.heightFt || draft.heightIn) && parseHeightCm(draft) == null) {
      return 'Use a height between 4 and 7 feet.';
    }
    if (draft.weight && parseWeightKg(draft) == null) {
      return 'Check that weight is in a realistic range.';
    }
    return null;
  }, [draft]);

  const buildProfileFromDraft = useCallback(async (opts?: { selfieUri?: string | null }) => {
    if (!draft.presentation || !parsedMeasurements) return null;
    const selfieUri = opts && 'selfieUri' in opts ? opts.selfieUri : draft.selfieUri;
    if (opts && 'selfieUri' in opts) {
      setDraftState((prev) => ({ ...prev, selfieUri: opts.selfieUri ?? null }));
    }
    setBuildingProfile(true);
    setError(null);
    try {
      const next = await buildBodyProfile({
        presentation: draft.presentation,
        heightCm: parsedMeasurements.heightCm,
        weightKg: parsedMeasurements.weightKg,
        selfieUri,
      });
      setProfile(next);
      return next;
    } catch {
      setError('Could not finish fit notes. Using measurements only.');
      return null;
    } finally {
      setBuildingProfile(false);
    }
  }, [draft, parsedMeasurements]);

  const addClosetPhotos = useCallback(async (uris: string[]) => {
    const room = MAX_WARDROBE - wardrobe.length;
    const take = uris.slice(0, Math.max(0, room));
    if (!take.length) {
      setError(`Closet is capped at ${MAX_WARDROBE} pieces for the demo.`);
      return;
    }
    setClassifying(true);
    setError(null);
    try {
      const items = await classifyGarments(take);
      setWardrobe((prev) => [...prev, ...items].slice(0, MAX_WARDROBE));
    } catch {
      setError('Could not read those photos. Try another shot.');
    } finally {
      setClassifying(false);
    }
  }, [wardrobe.length]);

  const loadDemoCloset = useCallback(() => {
    setWardrobe(demoWardrobeItems());
    setOutfits([]);
    setOutfitsSource(null);
    setError(null);
  }, []);

  const removeItem = useCallback((id: string) => {
    setWardrobe((prev) => prev.filter((item) => item.id !== id));
    setOutfits([]);
  }, []);

  const cycleCategory = useCallback((id: string) => {
    setWardrobe((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const index = CATEGORIES.indexOf(item.category);
        const category = CATEGORIES[(index + 1) % CATEGORIES.length] as Category;
        return { ...item, category, subcategory: category, classified: true };
      }),
    );
  }, []);

  const composeLooks = useCallback(async () => {
    if (!profile || !canComposeOutfits(wardrobe)) return false;
    setComposing(true);
    setError(null);
    try {
      const result = await composeOutfits(profile, wardrobe);
      setOutfits(result.outfits);
      setOutfitsSource(result.source);
      return result.outfits.length > 0;
    } catch {
      setError('Could not assemble outfits.');
      return false;
    } finally {
      setComposing(false);
    }
  }, [profile, wardrobe]);

  const value = useMemo<AppContextValue>(
    () => ({
      draft,
      setDraft,
      profile,
      wardrobe,
      outfits,
      outfitsSource,
      buildingProfile,
      classifying,
      composing,
      error,
      measurementError,
      parsedMeasurements,
      canCompose: canComposeOutfits(wardrobe),
      buildProfileFromDraft,
      addClosetPhotos,
      loadDemoCloset,
      removeItem,
      cycleCategory,
      composeLooks,
    }),
    [
      draft,
      setDraft,
      profile,
      wardrobe,
      outfits,
      outfitsSource,
      buildingProfile,
      classifying,
      composing,
      error,
      measurementError,
      parsedMeasurements,
      buildProfileFromDraft,
      addClosetPhotos,
      loadDemoCloset,
      removeItem,
      cycleCategory,
      composeLooks,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) {
    throw new Error('useAppState must be used inside AppProvider');
  }
  return value;
}
