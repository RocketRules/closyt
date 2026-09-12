import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Closyt } from '@/constants/theme';
import { useAppState } from '@/store/AppState';

export default function SelfieScreen() {
  const { draft, setDraft, buildProfileFromDraft, buildingProfile, parsedMeasurements } =
    useAppState();
  const [busy, setBusy] = useState(false);

  async function pick(from: 'camera' | 'library') {
    setBusy(true);
    try {
      if (from === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Camera needed', 'Allow camera access, or choose a photo from your library.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          cameraType: ImagePicker.CameraType.front,
          quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
          setDraft({ selfieUri: result.assets[0].uri });
        }
        return;
      }
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photos needed', 'Allow library access to pick a selfie.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setDraft({ selfieUri: result.assets[0].uri });
      }
    } finally {
      setBusy(false);
    }
  }

  async function continueNext(skipPhoto: boolean) {
    if (!parsedMeasurements) {
      Alert.alert('Measurements missing', 'Go back and enter height and weight.');
      return;
    }
    const profile = await buildProfileFromDraft(
      skipPhoto ? { selfieUri: null } : undefined,
    );
    if (profile) router.push('/done');
  }

  return (
    <Screen
      step="3 / 3"
      title="A casual selfie"
      subtitle="Chest-up is fine. We use it as a quiet color and vibe check — not a body scan."
      footer={
        <>
          <Button
            label={buildingProfile ? 'Saving your profile…' : 'Save profile'}
            disabled={busy || buildingProfile}
            onPress={() => void continueNext(false)}
          />
          <Button
            label="Skip photo"
            variant="ghost"
            disabled={buildingProfile}
            onPress={() => void continueNext(true)}
          />
        </>
      }>
      <View style={styles.preview}>
        {draft.selfieUri ? (
          <Image source={{ uri: draft.selfieUri }} style={styles.image} contentFit="cover" />
        ) : (
          <Text style={styles.placeholder}>Front-facing, natural light if you have it.</Text>
        )}
      </View>
      <View style={styles.actions}>
        <Button label="Take selfie" variant="secondary" disabled={busy} onPress={() => void pick('camera')} />
        <Button label="Choose photo" variant="secondary" disabled={busy} onPress={() => void pick('library')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: {
    height: 320,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: Closyt.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    color: Closyt.ink,
    paddingHorizontal: 24,
    textAlign: 'center',
    fontSize: 16,
  },
  actions: {
    gap: 10,
  },
});
