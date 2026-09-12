import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import WoodTexture from './WoodTexture';

/*
 * The Closyt mark: a clothes hanger cut out of a wooden tile.
 * The hook doubles as the C of the wordmark.
 */
export default function Logo({ size = 104, radius = 34 }) {
  const glyph = size * 0.58;
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: radius },
      ]}
    >
      <WoodTexture seed={7} density={0.3} tone={['#8A653F', '#4A3420']} box={{ w: 120, h: 120 }} />
      {/* Soft inner edge so the tile reads as a carved block, not a flat square. */}
      <View style={[StyleSheet.absoluteFill, styles.bevel, { borderRadius: radius }]} />
      <Svg width={glyph} height={glyph} viewBox="0 0 64 64" fill="none">
        <Defs>
          <LinearGradient id="wire" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FBF2E5" />
            <Stop offset="1" stopColor="#E4CFB4" />
          </LinearGradient>
        </Defs>
        {/* Hook — an open loop that reads as a C. */}
        <Path
          d="M32 26 V18.5 a6.2 6.2 0 1 0 -6.2 -6.2"
          stroke="url(#wire)"
          strokeWidth={3.1}
          strokeLinecap="round"
          fill="none"
        />
        {/* Shoulders and bar. */}
        <Path
          d="M32 26 L12.4 43.2 c-1.9 1.7-.7 4.9 1.9 4.9 h35.4 c2.6 0 3.8-3.2 1.9-4.9 L32 26 Z"
          stroke="url(#wire)"
          strokeWidth={3.1}
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
  bevel: {
    borderWidth: 1,
    borderColor: 'rgba(247,238,223,.18)',
  },
});
