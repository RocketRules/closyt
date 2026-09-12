import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans';
import { DMMono_400Regular } from '@expo-google-fonts/dm-mono';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';

import WelcomeScreen from './src/screens/WelcomeScreen';
import BasicsScreen from './src/screens/BasicsScreen';
import CaptureScreen from './src/screens/CaptureScreen';
import ReadyScreen from './src/screens/ReadyScreen';
import TodayScreen from './src/screens/TodayScreen';
import ClosetScreen from './src/screens/ClosetScreen';
import FitCheckScreen from './src/screens/FitCheckScreen';
import ItemDetailSheet from './src/screens/ItemDetailSheet';
import AddItemSheet from './src/screens/AddItemSheet';
import TabBar from './src/components/TabBar';
import { Screen } from './src/components/ui';
import { recommendOutfits, wardrobeStats } from './src/logic/recommend';
import { taggerReady } from './src/logic/tagger';
import { mergeBodyProfile } from './src/logic/bodyProfile';
import { analyzeSelfie } from './src/logic/analyzeSelfie';
import { buildRankRequest } from './src/logic/mapToFitEngine';
import { rankOutfits, suggestPieces } from './src/logic/fitEngineClient';
import * as store from './src/storage/store';
import { C } from './src/theme/theme';

const DEFAULT_DRAFT = { gender: 'Woman', age: 29, height: 168, weight: 62, hUnit: 'cm', wUnit: 'kg' };

const OUTFIT_NAMES = ['Easy Tuesday', 'Quiet Sharp', 'Layered Walk', 'Soft Structure', 'Low Effort', 'Long Line', 'Warm Neutral', 'Off Duty'];

function mapEngineOutfits(response, items) {
  if (!response?.outfits?.length) return [];
  const byId = {};
  items.forEach((it) => { byId[it.id] = it; });
  return response.outfits.map((o, i) => ({
    pieces: o.item_ids.map((id) => byId[id]).filter(Boolean),
    score: o.final_score,
    match: `${Math.min(99, Math.round(o.final_score * 10))}% you`,
    why: o.rationale || '',
    name: OUTFIT_NAMES[i % OUTFIT_NAMES.length],
    key: o.item_ids.sort().join('-'),
  }));
}

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMMono_400Regular,
    InstrumentSerif_400Regular,
  });

  const [screen, setScreen] = useState('loading');
  const [tab, setTab] = useState('recs');
  const [profileDraft, setProfileDraft] = useState(DEFAULT_DRAFT);
  const [profile, setProfile] = useState(null);
  const [items, setItems] = useState([]);
  const [wornCounts, setWornCounts] = useState({});
  const [outfitIndex, setOutfitIndex] = useState(0);
  const [worn, setWorn] = useState(false);
  const [detail, setDetail] = useState(null);
  const [adding, setAdding] = useState(false);
  const [addedThisSession, setAddedThisSession] = useState(0);
  const [taggerUp, setTaggerUp] = useState(false);
  const [engineStatus, setEngineStatus] = useState('idle');
  const [engineError, setEngineError] = useState(null);
  const [engineOutfits, setEngineOutfits] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const rankTimer = useRef(null);

  useEffect(() => {
    taggerReady().then(setTaggerUp);
    (async () => {
      const [saved, wardrobe, counts] = await Promise.all([
        store.getBodyProfile(),
        store.getWardrobe(),
        store.getWornCounts(),
      ]);
      setItems(wardrobe);
      setWornCounts(counts);
      if (saved) {
        setProfile(saved);
        setProfileDraft({ ...DEFAULT_DRAFT, ...saved });
        setScreen('app');
      } else {
        setScreen('welcome');
      }
    })();
  }, []);

  const persistItems = useCallback((next) => {
    setItems(next);
    store.saveWardrobe(next);
  }, []);

  /* Local on-device recommendations as a fallback. */
  const localOutfits = useMemo(
    () => recommendOutfits(items, profile, wornCounts),
    [items, profile, wornCounts]
  );

  /* Call the fit-scoring engine whenever wardrobe or profile changes (debounced). */
  useEffect(() => {
    if (!profile || !items.length) {
      setEngineOutfits([]);
      setEngineStatus('idle');
      return;
    }
    if (rankTimer.current) clearTimeout(rankTimer.current);
    rankTimer.current = setTimeout(async () => {
      setEngineStatus('loading');
      setEngineError(null);
      try {
        const req = buildRankRequest(items, profile);
        const resp = await rankOutfits(req);
        const mapped = mapEngineOutfits(resp, items);
        setEngineOutfits(mapped);
        setEngineStatus('ok');
        /* Also fetch wardrobe gap suggestions (non-blocking). */
        suggestPieces(req).then(setSuggestions).catch(() => {});
      } catch (err) {
        console.warn('Fit engine error:', err.message);
        setEngineError(err.message);
        setEngineOutfits([]);
        setEngineStatus('error');
      }
    }, 400);
    return () => { if (rankTimer.current) clearTimeout(rankTimer.current); };
  }, [items, profile]);

  /* Use engine outfits when available, otherwise local. */
  const outfits = engineStatus === 'ok' && engineOutfits.length ? engineOutfits : localOutfits;
  const stats = useMemo(() => wardrobeStats(items, outfits), [items, outfits]);

  const finishOnboarding = async (photos) => {
    /* Analyze the best selfie (first photo with a face, or the first one). */
    let vision = null;
    if (photos && photos.length) {
      try {
        vision = await analyzeSelfie(photos[0]);
      } catch (e) {
        console.warn('Selfie analysis skipped:', e.message);
      }
    }
    const merged = mergeBodyProfile(profileDraft, vision);
    const next = { ...profileDraft, ...merged, photos };
    setProfile(next);
    store.saveBodyProfile(next);
    setScreen('ready');
  };

  const wearOutfit = () => {
    const outfit = outfits[outfitIndex % outfits.length];
    if (!outfit) return;
    const next = { ...wornCounts };
    outfit.pieces.forEach((p) => {
      next[p.id] = (next[p.id] || 0) + 1;
    });
    setWornCounts(next);
    store.saveWornCounts(next);
    setWorn(true);
  };

  if (!fontsLoaded || screen === 'loading') {
    return (
      <SafeAreaProvider>
        <Screen />
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {screen === 'welcome' && <WelcomeScreen onStart={() => setScreen('basics')} />}

      {screen === 'basics' && (
        <BasicsScreen
          draft={profileDraft}
          onChange={(patch) => setProfileDraft((d) => ({ ...d, ...patch }))}
          onDone={() => setScreen('capture')}
        />
      )}

      {screen === 'capture' && <CaptureScreen onDone={finishOnboarding} />}

      {screen === 'ready' && (
        <ReadyScreen
          onEnter={() => {
            setScreen('app');
            setTab('recs');
          }}
        />
      )}

      {screen === 'app' && (
        <MainApp
          tab={tab}
          setTab={setTab}
          items={items}
          outfits={outfits}
          outfitIndex={outfitIndex}
          worn={worn}
          stats={stats}
          profile={profile}
          engineStatus={engineStatus}
          engineError={engineError}
          suggestions={suggestions}
          onSkipOutfit={() => {
            setOutfitIndex((i) => i + 1);
            setWorn(false);
          }}
          onWearOutfit={wearOutfit}
          onAdd={() => setAdding(true)}
          onOpenItem={setDetail}
        />
      )}

      {detail && (
        <View style={StyleSheet.absoluteFill}>
          <ItemDetailSheet
            item={detail}
            onClose={() => setDetail(null)}
            onSave={(updated) => {
              persistItems(items.map((i) => (i.id === updated.id ? updated : i)));
              setDetail(null);
            }}
            onDelete={(id) => {
              persistItems(items.filter((i) => i.id !== id));
              setDetail(null);
            }}
          />
        </View>
      )}

      {adding && (
        <View style={StyleSheet.absoluteFill}>
          <AddItemSheet
            addedThisSession={addedThisSession}
            taggerUp={taggerUp}
            onClose={() => setAdding(false)}
            onAdded={(item) => {
              const withId = { ...item, id: item.id || String(Date.now()) };
              persistItems([withId, ...items]);
              setAddedThisSession((n) => n + 1);
              setAdding(false);
              setTab('closet');
              setDetail(withId);
            }}
          />
        </View>
      )}
    </SafeAreaProvider>
  );
}

function MainApp({
  tab,
  setTab,
  items,
  outfits,
  outfitIndex,
  worn,
  stats,
  profile,
  engineStatus,
  engineError,
  suggestions,
  onSkipOutfit,
  onWearOutfit,
  onAdd,
  onOpenItem,
}) {
  const insets = useSafeAreaInsets();
  return (
    <Screen style={{ flex: 1 }} wood woodSeed={31}>
      <View style={{ flex: 1 }}>
        {tab === 'recs' && (
          <TodayScreen
            outfits={outfits}
            index={outfitIndex}
            worn={worn}
            stats={stats}
            engineStatus={engineStatus}
            engineError={engineError}
            suggestions={suggestions}
            onSkip={onSkipOutfit}
            onWear={onWearOutfit}
            onAdd={onAdd}
          />
        )}
        {tab === 'closet' && <ClosetScreen items={items} onAdd={onAdd} onOpen={onOpenItem} />}
        {tab === 'fit' && <FitCheckScreen profile={profile} />}
      </View>
      <TabBar tab={tab} onChange={setTab} bottomInset={insets.bottom} />
    </Screen>
  );
}
