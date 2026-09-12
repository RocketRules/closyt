import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { C } from '../theme/theme';

/* Swaps the camera between the front and rear lens. */
export default function FlipButton({ onPress, size = 48, style }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Switch camera"
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2, opacity: pressed ? 0.6 : 1 },
        style,
      ]}
    >
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        {/* Two arrows chasing each other around the lens. */}
        <Path
          d="M4.5 9.5a7.5 7.5 0 0 1 12.4-3.1l2 1.9"
          stroke={C.textSoft}
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M19.5 14.5a7.5 7.5 0 0 1-12.4 3.1l-2-1.9"
          stroke={C.textSoft}
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M18.9 4.2v4.1h-4.1"
          stroke={C.textSoft}
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M5.1 19.8v-4.1h4.1"
          stroke={C.textSoft}
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18,11,7,.72)',
    borderWidth: 1,
    borderColor: 'rgba(240,225,210,.16)',
  },
});
