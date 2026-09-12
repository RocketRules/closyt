import React, { useRef, useState } from 'react';
import { View, Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Mono, Body, PrimaryButton } from '../components/ui';
import FlipButton from '../components/FlipButton';
import { tagGarment } from '../logic/tagging';
import { C, F } from '../theme/theme';

export default function AddItemSheet({ addedThisSession, taggerUp, onClose, onAdded }) {
  const [busy, setBusy] = useState(false);
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef(null);
  const insets = useSafeAreaInsets();

  const handlePhoto = async (uri) => {
    setBusy(true);
    const item = await tagGarment(uri);
    setBusy(false);
    onAdded(item);
  };

  const shoot = async () => {
    if (!camera.current || busy) return;
    try {
      const shot = await camera.current.takePictureAsync({ quality: 0.6, skipProcessing: true });
      await handlePhoto(shot.uri);
    } catch {
      setBusy(false);
    }
  };

  /* Falls back to the library when the camera is unavailable (simulators). */
  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
    if (!res.canceled && res.assets?.length) await handlePhoto(res.assets[0].uri);
  };

  return (
    <Screen
      colors={[C.bgDarkTop, C.bgDarkBottom]}
      style={{ paddingHorizontal: 24, paddingTop: insets.top + 14 }}
    >
      <View style={styles.head}>
        <Pressable onPress={onClose} style={styles.back}>
          <Text style={styles.backLabel}>←</Text>
        </Pressable>
        <Mono size={10.5} color={busy ? C.ember : C.dim}>
          {busy
            ? 'reading the garment…'
            : !taggerUp
              ? 'tagger offline · colour only'
              : addedThisSession
                ? `${addedThisSession} added this session`
                : 'new item'}
        </Mono>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.frame}>
        {permission?.granted ? (
          <CameraView ref={camera} facing={facing} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={styles.fallback}>
            <View style={styles.plate} />
            <Body size={13.5} color={C.dim} style={{ textAlign: 'center', maxWidth: 220 }}>
              Closyt needs the camera to read your garments.
            </Body>
            <PrimaryButton label="Allow camera" onPress={requestPermission} height={46} />
          </View>
        )}
        <View pointerEvents="none" style={styles.caption}>
          <Mono size={10.5} color="rgba(240,225,210,.6)">lay the item flat</Mono>
        </View>
      </View>

      <View style={[styles.controls, { marginBottom: 34 + insets.bottom }]}>
        <Pressable onPress={pick} style={styles.side}>
          <Text style={styles.sideLabel}>Library</Text>
        </Pressable>
        <Pressable
          onPress={shoot}
          disabled={!permission?.granted || busy}
          style={({ pressed }) => [
            styles.shutter,
            { backgroundColor: pressed ? C.mahHi : C.mah, opacity: permission?.granted ? 1 : 0.4 },
          ]}
        >
          {busy && <ActivityIndicator color="#F7EADD" />}
        </Pressable>
        <View style={[styles.side, { alignItems: 'flex-end' }]}>
          {permission?.granted && (
            <FlipButton onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))} />
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  back: {
    width: 38,
    height: 38,
    borderRadius: 99,
    backgroundColor: 'rgba(240,225,210,.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backLabel: { color: C.textSoft, fontSize: 17, fontFamily: F.sans },
  frame: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.dashed,
    backgroundColor: C.wash,
    overflow: 'hidden',
  },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 24 },
  plate: {
    width: 150,
    height: 150,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(240,225,210,.16)',
    backgroundColor: 'rgba(240,225,210,.05)',
  },
  caption: { position: 'absolute', bottom: 14, left: 0, right: 0, alignItems: 'center' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 26, marginTop: 24 },
  side: { width: 60 },
  sideLabel: { fontFamily: F.sans, fontSize: 13, color: C.dim },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 99,
    borderWidth: 4,
    borderColor: 'rgba(240,225,210,.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
