import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Display, Mono, Body, PrimaryButton } from '../components/ui';
import WoodTexture from '../components/WoodTexture';
import Logo from '../components/Logo';
import { C } from '../theme/theme';

export default function WelcomeScreen({ onStart }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bgBottom }}>
      <WoodTexture seed={23} density={1.1} tone={['#3A2616', '#150D08']} />
      {/* Vignette so the wood falls away at the edges and the type stays legible. */}
      <LinearGradient
        colors={['rgba(21,13,8,0)', 'rgba(21,13,8,.55)', 'rgba(13,8,5,.92)']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ flex: 1, paddingHorizontal: 28 }}>
        <View style={[styles.hero, { paddingTop: insets.top }]}>
          <Logo size={104} radius={34} />
          <View style={{ alignItems: 'center' }}>
            <Display size={42}>Closyt</Display>
            <Mono size={11} style={{ letterSpacing: 1.76, marginTop: 10 }}>
              wear what you own
            </Mono>
          </View>
        </View>
        <View style={{ paddingBottom: 48 + insets.bottom }}>
          <PrimaryButton label="Get started" onPress={onStart} height={56} />
          <Body size={13} color={C.faint} style={{ textAlign: 'center', marginTop: 16 }}>
            Takes about a minute
          </Body>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22 },
});
