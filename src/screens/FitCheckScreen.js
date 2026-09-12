import React, { useState, useRef } from 'react';
import { View, ScrollView, Pressable, Text, Image, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Display, Mono, Body, GhostButton, Card } from '../components/ui';
import FlipButton from '../components/FlipButton';
import { scoreFit } from '../logic/fitcheck';
import { C, F } from '../theme/theme';

export default function FitCheckScreen({ profile }) {
  const [stage, setStage] = useState('idle'); // idle | camera | scanning | done
  const [result, setResult] = useState(null);
  const [photo, setPhoto] = useState(null);
  /* A mirror selfie is the natural way to shoot your own outfit. */
  const [facing, setFacing] = useState('front');
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef(null);
  const insets = useSafeAreaInsets();

  const begin = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res?.granted) return;
    }
    setStage('camera');
  };

  const shoot = async () => {
    if (!camera.current) return;
    try {
      const shot = await camera.current.takePictureAsync({ quality: 0.6, skipProcessing: true });
      setPhoto(shot.uri);
      setStage('scanning');
      setTimeout(() => {
        setResult(scoreFit(shot.uri, profile));
        setStage('done');
      }, 1300);
    } catch {
      setStage('idle');
    }
  };

  return (
    <LinearGradient
      colors={[C.bgFitTop, C.bgFitBottom]}
      style={{ flex: 1, paddingTop: insets.top + 14, paddingHorizontal: 22 }}
    >
      <Display size={30}>Fit Check</Display>

      {stage === 'idle' && (
        <View style={styles.center}>
          <Body size={15} style={{ textAlign: 'center', maxWidth: 250 }}>
            Wearing something right now? Let us see it.
          </Body>
          <Pressable onPress={begin} style={({ pressed }) => [styles.snapWrap, pressed && { opacity: 0.85 }]}>
            <LinearGradient
              colors={['#946E4A', '#5F452D']}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.snap}
            >
              <Text style={styles.snapLabel}>Snap it</Text>
            </LinearGradient>
          </Pressable>
          <Mono size={10.5} color={C.faint}>one tap · no filters</Mono>
        </View>
      )}

      {stage === 'camera' && (
        <View style={styles.cameraWrap}>
          <CameraView ref={camera} facing={facing} style={StyleSheet.absoluteFill} />
          <View style={styles.shootRow}>
            <View style={{ width: 48 }} />
            <Pressable
              onPress={shoot}
              style={({ pressed }) => [styles.shutter, { backgroundColor: pressed ? C.mahHi : C.mah }]}
            />
            <View style={{ width: 48, alignItems: 'flex-end' }}>
              <FlipButton onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))} />
            </View>
          </View>
        </View>
      )}

      {stage === 'scanning' && (
        <View style={styles.center}>
          {photo && <Image source={{ uri: photo }} style={styles.scanPhoto} />}
          <Spinner />
          <Mono size={11} color={C.dim}>reading the fit…</Mono>
        </View>
      )}

      {stage === 'done' && result && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 18, gap: 14 }}>
          <View style={styles.scoreCard}>
            {photo && <Image source={{ uri: photo }} style={styles.scoreThumb} />}
            <Text style={styles.scoreNum}>{result.score}</Text>
            <View style={{ flex: 1 }}>
              <Display size={23}>{result.verdict}</Display>
              <Mono size={10} color={C.faint} style={{ marginTop: 6 }}>out of 10 · todays fit</Mono>
            </View>
          </View>

          <Card style={{ paddingHorizontal: 20, paddingVertical: 18, gap: 12 }}>
            {result.bars.map((b) => (
              <View key={b.label}>
                <View style={styles.barHead}>
                  <Body size={13.5} style={{ flex: 1 }}>{b.label}</Body>
                  <Body size={13.5} color={C.textSoft}>{b.val}</Body>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${b.pct}%`, backgroundColor: b.color }]} />
                </View>
              </View>
            ))}
          </Card>

          <View style={styles.tipCard}>
            <Mono size={10} color={C.ember} style={{ marginBottom: 6 }}>one tweak</Mono>
            <Body size={14.5} color="#EBDACA">{result.tip}</Body>
          </View>

          <GhostButton
            label="Try another fit"
            onPress={() => {
              setStage('idle');
              setPhoto(null);
            }}
            style={{ height: 52 }}
          />
        </ScrollView>
      )}
    </LinearGradient>
  );
}

/* The ring from the design, spinning. */
function Spinner() {
  const spin = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View
      style={{
        width: 70,
        height: 70,
        borderRadius: 99,
        borderWidth: 4,
        borderColor: 'rgba(188,150,112,.2)',
        borderTopColor: C.ember,
        transform: [{ rotate }],
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingBottom: 36 },
  snapWrap: {
    borderRadius: 99,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 38,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
  snap: { width: 150, height: 150, borderRadius: 99, alignItems: 'center', justifyContent: 'center' },
  snapLabel: { fontFamily: F.serif, fontSize: 24, color: '#F7EADD' },
  cameraWrap: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 20,
    backgroundColor: '#000',
  },
  shootRow: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 26,
  },
  shutter: { width: 76, height: 76, borderRadius: 99, borderWidth: 4, borderColor: 'rgba(240,225,210,.8)' },
  scanPhoto: { width: 120, height: 160, borderRadius: 20, opacity: 0.5 },
  scoreCard: {
    marginTop: 12,
    backgroundColor: C.cardDeep,
    borderWidth: 1,
    borderColor: 'rgba(240,225,210,.08)',
    borderRadius: 26,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scoreThumb: { width: 58, height: 78, borderRadius: 14 },
  scoreNum: { fontFamily: F.serif, fontSize: 62, lineHeight: 62, color: '#CFAE87' },
  barHead: { flexDirection: 'row', alignItems: 'baseline', gap: 10, justifyContent: 'space-between', marginBottom: 9 },
  barTrack: { height: 6, borderRadius: 99, backgroundColor: C.track, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 99 },
  tipCard: {
    backgroundColor: C.cardAlt,
    borderWidth: 1,
    borderColor: 'rgba(188,150,112,.28)',
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
});
