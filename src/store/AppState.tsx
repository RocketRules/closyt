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

import { buildBodyProfile } from '@/lib/analyzeSelfie';
import { parseHeightCm, parseWeightKg } from '@/lib/bmi';
import type { BodyProfile, OnboardingDraft } from '@/types';

const STORAGE_KEY = '@closyt/body-profile';

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
};

type AppContextValue = {
  draft: OnboardingDraft;
  setDraft: (patch: Partial<OnboardingDraft>) => void;
  profile: BodyProfile | null;
  buildingProfile: boolean;
  error: string | null;
  measurementError: string | null;
  parsedMeasurements: { heightCm: number; weightKg: number } | null;
  buildProfileFromDraft: (opts?: { selfieUri?: string | null }) => Promise<BodyProfile | null>;
  resetProfile: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<OnboardingDraft>(DEFAULT_DRAFT);
  const [profile, setProfile] = useState<BodyProfile | null>(null);
  const [buildingProfile, setBuildingProfile] = useState(false);
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
      JSON.stringify({ draft, profile } satisfies Persisted),
    );
  }, [draft, profile, hydrated]);

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

  const resetProfile = useCallback(() => {
    setProfile(null);
    setDraftState(DEFAULT_DRAFT);
    setError(null);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      draft,
      setDraft,
      profile,
      buildingProfile,
      error,
      measurementError,
      parsedMeasurements,
      buildProfileFromDraft,
      resetProfile,
    }),
    [
      draft,
      setDraft,
      profile,
      buildingProfile,
      error,
      measurementError,
      parsedMeasurements,
      buildProfileFromDraft,
      resetProfile,
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
