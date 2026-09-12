import React from 'react';
import { Text, Pressable, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import WoodTexture from './WoodTexture';
import { C, F } from '../theme/theme';

/*
 * Full-bleed warm gradient every screen sits on.
 * `wood` lays a faint grain underneath, which is what gives the app its
 * wardrobe feel without ever competing with the content on top.
 */
export function Screen({ colors = [C.bgTop, C.bgBottom], wood = false, woodSeed = 11, style, children }) {
  return (
    <LinearGradient colors={colors} style={[{ flex: 1 }, style]}>
      {wood && <WoodTexture seed={woodSeed} density={0.8} opacity={0.5} tone={['#2A1B10', '#170F0A']} />}
      {children}
    </LinearGradient>
  );
}

/* Display serif — the Instrument Serif headings. */
export const Display = ({ size = 30, color = C.text, style, children }) => (
  <Text style={[{ fontFamily: F.serif, fontSize: size, color, lineHeight: size * 1.12 }, style]}>
    {children}
  </Text>
);

/* Uppercase mono label — kickers, counts, status lines. */
export const Mono = ({ size = 10.5, color = C.dim, style, children }) => (
  <Text
    style={[
      { fontFamily: F.mono, fontSize: size, color, letterSpacing: size * 0.06, textTransform: 'uppercase' },
      style,
    ]}
  >
    {children}
  </Text>
);

/* Body copy. */
export const Body = ({ size = 14, color = C.muted, weight, style, children }) => (
  <Text
    style={[
      { fontFamily: weight === 'medium' ? F.sansMed : F.sans, fontSize: size, color, lineHeight: size * 1.45 },
      style,
    ]}
  >
    {children}
  </Text>
);

/* Solid mahogany call to action. */
export function PrimaryButton({ label, onPress, height = 54, style, bg = C.mah, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primary,
        { height, borderRadius: height / 3.1, backgroundColor: pressed ? C.mahHi : bg, opacity: disabled ? 0.45 : 1 },
        style,
      ]}
    >
      <Text style={styles.primaryLabel}>{label}</Text>
    </Pressable>
  );
}

/* Outlined secondary action. */
export function GhostButton({ label, onPress, style }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      styles.ghost,
      { borderColor: pressed ? 'rgba(240,225,210,.42)' : C.outline },
      style,
    ]}>
      <Text style={styles.ghostLabel}>{label}</Text>
    </Pressable>
  );
}

/* Warm card surface used for every grouped block. */
export const Card = ({ style, children }) => <View style={[styles.card, style]}>{children}</View>;

/* Diagonal hatch that stands in for a garment photo. */
export const Hatch = ({ opacity = 0.16 }) => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    {Array.from({ length: 26 }).map((_, i) => (
      <View
        key={i}
        style={{
          position: 'absolute',
          top: -140 + i * 14,
          left: -60,
          right: -60,
          height: 7,
          backgroundColor: `rgba(0,0,0,${opacity})`,
          transform: [{ rotate: '45deg' }],
        }}
      />
    ))}
  </View>
);

const styles = StyleSheet.create({
  primary: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  primaryLabel: { fontFamily: F.sansMed, fontSize: 16, color: C.textWarm },
  ghost: {
    height: 54,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostLabel: { fontFamily: F.sans, fontSize: 15, color: C.muted },
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
    borderRadius: 22,
  },
});
