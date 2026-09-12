import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Display, Mono, Body, PrimaryButton } from '../components/ui';
import FlipButton from '../components/FlipButton';
import { C, F } from '../theme/theme';

const SHOTS = [
  { title: 'Face, straight on', hint: 'Neutral light, no sunglasses', facing: 'front' },
  { title: 'Full body, front', hint: 'Arms relaxed, feet in frame', facing: 'back' },
  { title: 'Full body, side', hint: 'Turn left, stand tall', facing: 'back' },
];

export default function CaptureScreen({ onDone }) {
  const [shot, setShot] = useState(0);
  const [photos, setPhotos] = useState([]);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef(null);
  const insets = useSafeAreaInsets();

  const current = SHOTS[Math.min(shot, 2)];

  /*
   * Each shot suggests a lens (selfie for the face, rear for full body), but
   * the user can override it and that choice sticks until the next shot.
   */
  const [facing, setFacing] = useState(SHOTS[0].facing);
  useEffect(() => {
    setFacing(SHOTS[Math.min(shot, 2)].facing);
  }, [shot]);

  const advance = (uri) => {
    const next = uri ? [...photos, uri] : photos;
    setPhotos(next);
    setPreview(null);
    if (shot >= 2) onDone(next);
    else setShot(shot + 1);
  };

  const capture = async () => {
    if (!camera.current || busy) return;
    setBusy(true);
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.6, skipProcessing: true });
      setPreview(photo.uri);
      /* Let the user see the frame land before moving on. */
      setTimeout(() => advance(photo.uri), 550);
    } catch {
      advance(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen colors={[C.bgDarkTop, C.bgDarkBottom]} style={{ paddingHorizontal: 24, paddingTop: insets.top + 20 }}>
      <View style={styles.dots}>
        {[0, 1, 2].map((n) => (
          <View
            key={n}
            style={[
              styles.dot,
              { backgroundColor: n < shot ? C.mahHi : n === shot ? C.ember : 'rgba(240,225,210,.18)' },
            ]}
          />
        ))}
      </View>
      <Display size={27} style={{ textAlign: 'center', marginBottom: 4 }}>
        {current.title}
      </Display>
      <Body size={13.5} color={C.dim} style={{ textAlign: 'center', marginBottom: 20 }}>
        {current.hint}
      </Body>

      <View style={styles.frame}>
        {preview ? (
          <Image source={{ uri: preview }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : permission?.granted ? (
          <CameraView ref={camera} facing={facing} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={styles.permission}>
            <View style={styles.silhouette} />
            <Body size={13.5} color={C.dim} style={{ textAlign: 'center', maxWidth: 220 }}>
              Closyt needs the camera to build your body profile.
            </Body>
            <PrimaryButton label="Allow camera" onPress={requestPermission} height={46} />
          </View>
        )}
        {permission?.granted && !preview && (
          <View pointerEvents="none" style={styles.guide}>
            <Mono size={10.5} color="rgba(240,225,210,.6)">
              {`photo ${Math.min(shot + 1, 3)} of 3`}
            </Mono>
          </View>
        )}
      </View>

      <View style={[styles.controls, { marginBottom: 34 + insets.bottom }]}>
        <View style={{ width: 48, alignItems: 'flex-start' }}>
          {permission?.granted && !preview && (
            <FlipButton onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))} />
          )}
        </View>
        <Pressable
          onPress={capture}
          disabled={!permission?.granted || busy}
          style={({ pressed }) => [
            styles.shutter,
            { backgroundColor: pressed ? C.mahHi : C.mah, opacity: permission?.granted ? 1 : 0.4 },
          ]}
        >
          {busy && <ActivityIndicator color="#F7EADD" />}
        </Pressable>
        <Pressable onPress={() => advance(null)} style={{ width: 48 }}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 18 },
  dot: { width: 30, height: 4, borderRadius: 99 },
  frame: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.dashed,
    backgroundColor: C.wash,
    overflow: 'hidden',
  },
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 24 },
  silhouette: {
    width: 110,
    height: 196,
    borderTopLeftRadius: 56,
    borderTopRightRadius: 56,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(240,225,210,.16)',
    backgroundColor: 'rgba(240,225,210,.05)',
  },
  guide: { position: 'absolute', bottom: 14, left: 0, right: 0, alignItems: 'center' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 26, marginTop: 24 },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 99,
    borderWidth: 4,
    borderColor: 'rgba(240,225,210,.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skip: { fontFamily: F.sans, fontSize: 13, color: C.dim },
});
