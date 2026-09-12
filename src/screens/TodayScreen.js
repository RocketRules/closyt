import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Display, Mono, Body, PrimaryButton, GhostButton } from '../components/ui';
import ItemThumb from '../components/ItemThumb';
import { C } from '../theme/theme';

export default function TodayScreen({ outfits, index, worn, onSkip, onWear, onAdd, stats, engineStatus, engineError }) {
  const insets = useSafeAreaInsets();
  const outfit = outfits.length ? outfits[index % outfits.length] : null;

  return (
    <View style={{ flex: 1, paddingTop: insets.top + 14, paddingHorizontal: 22 }}>
      <View style={styles.header}>
        <Display size={30}>Today</Display>
        <Mono size={10.5}>
          {engineStatus === 'loading'
            ? 'Ranking outfits…'
            : stats.total
              ? `${stats.inRotation}/${stats.total} in rotation`
              : 'empty closet'}
        </Mono>
      </View>

      {engineStatus === 'loading' && !outfit ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={C.ember} />
          <Body size={14.5} style={{ textAlign: 'center', maxWidth: 260, marginTop: 12 }}>
            The fit engine is scoring your wardrobe…
          </Body>
        </View>
      ) : engineStatus === 'error' ? (
        <View style={styles.empty}>
          <Display size={22} style={{ textAlign: 'center', maxWidth: 260 }}>
            Fit engine offline
          </Display>
          <Body size={13.5} style={{ textAlign: 'center', maxWidth: 280, marginTop: 6 }}>
            {engineError || 'Could not reach the scoring service. Make sure it is running on your laptop.'}
          </Body>
          <PrimaryButton
            label="Add items to your Closet"
            onPress={onAdd}
            height={58}
            style={{ marginTop: 18, paddingHorizontal: 28 }}
          />
        </View>
      ) : !outfit ? (
        <View style={styles.empty}>
          <View style={styles.placeholderGrid}>
            {[0, 1, 2, 3].map((n) => (
              <View key={n} style={styles.placeholder} />
            ))}
          </View>
          <Display size={26} style={{ textAlign: 'center', maxWidth: 250 }}>
            Nothing to style yet
          </Display>
          <Body size={14.5} style={{ textAlign: 'center', maxWidth: 250 }}>
            Snap a top, a bottom and a pair of shoes — Closyt starts pairing them for you.
          </Body>
          <PrimaryButton
            label="Add items to your Closet"
            onPress={onAdd}
            height={58}
            style={{ marginTop: 10, paddingHorizontal: 28 }}
          />
        </View>
      ) : (
        <View style={styles.body}>
          <View>
            {/* Stacked cards behind, hinting at the other combinations queued up. */}
            <View style={[styles.stack, { top: 18, left: 12, right: 12, bottom: -14, backgroundColor: '#20150E' }]} />
            <View style={[styles.stack, { top: 9, left: 6, right: 6, bottom: -7, backgroundColor: '#241810' }]} />
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Display size={24}>{outfit.name}</Display>
                <Mono size={10.5} color={C.ember}>{outfit.match}</Mono>
              </View>
              <View style={styles.grid}>
                {outfit.pieces.map((piece) => (
                  <ItemThumb
                    key={piece.id}
                    item={piece}
                    label={piece.type}
                    style={styles.tile}
                  />
                ))}
              </View>
              <Body size={13.5} style={{ marginTop: 14 }}>
                {outfit.why}
              </Body>
            </View>
          </View>
          <View style={styles.actions}>
            <GhostButton label="Not today" onPress={onSkip} style={{ flex: 1 }} />
            <PrimaryButton
              label={worn ? 'Wearing this ✓' : "I'll wear this"}
              onPress={onWear}
              bg={worn ? '#533C27' : C.mah}
              style={{ flex: 1.4 }}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 40 },
  placeholderGrid: { flexDirection: 'row', flexWrap: 'wrap', width: 120, gap: 8, marginBottom: 6 },
  placeholder: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(240,225,210,.05)',
    borderWidth: 1,
    borderColor: 'rgba(240,225,210,.1)',
  },
  body: { flex: 1, justifyContent: 'center', paddingBottom: 16 },
  stack: { position: 'absolute', borderRadius: 26 },
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
    borderRadius: 26,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  cardHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '47.6%', aspectRatio: 1, borderWidth: 1, borderColor: 'rgba(240,225,210,.07)' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 32 },
});
