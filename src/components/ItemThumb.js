import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Hatch, Mono } from './ui';
import { swatchFor } from '../theme/theme';

/*
 * A garment thumbnail. Shows the real photo once the user has taken one,
 * and falls back to the colour swatch + hatch treatment from the design.
 */
export default function ItemThumb({ item, style, label, labelColor = 'rgba(20,12,8,.78)', radius = 16 }) {
  const tint = swatchFor(item.colorName);
  return (
    <View style={[{ backgroundColor: tint, borderRadius: radius, overflow: 'hidden' }, style]}>
      {item.photo ? (
        <Image source={{ uri: item.photo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <Hatch />
      )}
      {label ? (
        <View style={styles.label}>
          <Mono size={9.5} color={item.photo ? 'rgba(247,238,223,.92)' : labelColor}>
            {label}
          </Mono>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { position: 'absolute', left: 10, bottom: 9, right: 8 },
});
