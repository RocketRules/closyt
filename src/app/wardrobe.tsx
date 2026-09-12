import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Closyt, Spacing } from '@/constants/theme';
import { useAppState } from '@/store/AppState';
import { MAX_WARDROBE } from '@/types';

export default function WardrobeScreen() {
  const {
    wardrobe,
    addClosetPhotos,
    loadDemoCloset,
    removeItem,
    cycleCategory,
    classifying,
    composing,
    canCompose,
    composeLooks,
    error,
    profile,
  } = useAppState();

  async function addPhotos() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photos needed', 'Allow library access to add closet pieces.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, MAX_WARDROBE - wardrobe.length),
      quality: 0.8,
    });
    if (!result.canceled) {
      await addClosetPhotos(result.assets.map((asset) => asset.uri));
    }
  }

  async function makeOutfits() {
    if (!profile) {
      Alert.alert('Fit profile missing', 'Go back and finish height, weight, and selfie.');
      return;
    }
    const ok = await composeLooks();
    if (ok) router.push('/outfits');
    else Alert.alert('Need more pieces', 'Add at least a top and bottom, or one dress.');
  }

  return (
    <Screen
      step="4 / 5"
      title="Your closet"
      subtitle="Add garment photos (hanger or flat lay). We only combine what you upload."
      footer={
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label={
              classifying
                ? 'Tagging pieces…'
                : composing
                  ? 'Putting looks together…'
                  : 'Make outfits'
            }
            disabled={!canCompose || classifying || composing}
            onPress={() => void makeOutfits()}
          />
          <Button
            label="Add photos"
            variant="secondary"
            disabled={classifying || wardrobe.length >= MAX_WARDROBE}
            onPress={() => void addPhotos()}
          />
        </>
      }>
      <View style={styles.toolbar}>
        <Text style={styles.count}>
          {wardrobe.length} / {MAX_WARDROBE} pieces
        </Text>
        <Pressable onPress={loadDemoCloset} accessibilityRole="button">
          <Text style={styles.demo}>Load demo closet</Text>
        </Pressable>
      </View>

      {wardrobe.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No pieces yet</Text>
          <Text style={styles.emptyBody}>
            Load the seeded closet for judging, or add 4+ photos of your own clothes.
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {wardrobe.map((item) => (
            <View key={item.id} style={styles.card}>
              <Image source={{ uri: item.photoUri }} style={styles.thumb} contentFit="cover" />
              <Text style={styles.label} numberOfLines={1}>
                {item.label}
              </Text>
              <Pressable onPress={() => cycleCategory(item.id)}>
                <Text style={styles.meta}>
                  {item.category}
                  {item.classified ? '' : ' · tap to set'}
                </Text>
              </Pressable>
              <Pressable onPress={() => removeItem(item.id)}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  count: {
    color: Closyt.muted,
    fontWeight: '600',
  },
  demo: {
    color: Closyt.accent,
    fontWeight: '700',
  },
  empty: {
    backgroundColor: Closyt.card,
    borderRadius: 24,
    padding: Spacing.four,
    gap: 8,
    borderWidth: 1,
    borderColor: Closyt.line,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Closyt.ink,
  },
  emptyBody: {
    color: Closyt.muted,
    lineHeight: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: Closyt.card,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Closyt.line,
    paddingBottom: 10,
  },
  thumb: {
    width: '100%',
    height: 140,
    backgroundColor: Closyt.accentSoft,
  },
  label: {
    marginTop: 8,
    marginHorizontal: 10,
    fontWeight: '700',
    color: Closyt.ink,
  },
  meta: {
    marginHorizontal: 10,
    color: Closyt.muted,
    textTransform: 'capitalize',
  },
  remove: {
    marginHorizontal: 10,
    marginTop: 4,
    color: Closyt.accent,
    fontWeight: '600',
  },
  error: {
    color: Closyt.accent,
    textAlign: 'center',
    fontWeight: '600',
  },
});
