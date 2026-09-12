import React, { useState } from 'react';
import { View, ScrollView, Pressable, Text, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Display, Mono, Body, PrimaryButton, Hatch } from '../components/ui';
import { describeGarment } from '../logic/describeGarment';
import { C, F, TYPES, COLORS, FITS, swatchFor } from '../theme/theme';

export default function ItemDetailSheet({ item, onClose, onSave, onDelete }) {
  const [draft, setDraft] = useState(item);
  const insets = useSafeAreaInsets();

  const fields = [
    { label: 'Type', options: TYPES, current: draft.cat, apply: (v) => ({ cat: v, type: v }) },
    { label: 'Colour', options: COLORS, current: draft.colorName, apply: (v) => ({ colorName: v }) },
    { label: 'Fit', options: FITS, current: draft.fit, apply: (v) => ({ fit: v }) },
  ];

  return (
    <Screen>
      <View style={[styles.hero, { backgroundColor: swatchFor(draft.colorName) }]}>
        {draft.photo ? (
          <Image source={{ uri: draft.photo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Hatch />
        )}
        <Pressable onPress={onClose} style={[styles.back, { top: insets.top + 8 }]}>
          <Text style={styles.backLabel}>←</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 20, paddingBottom: 26 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <Display size={28}>{draft.type}</Display>
        <Mono size={10.5} style={{ marginTop: 8, marginBottom: 20 }}>
          {draft.needsReview ? 'auto-tagged · tap to correct' : 'tagged · tap to change'}
        </Mono>

        {fields.map((field) => (
          <View key={field.label} style={{ marginBottom: 18 }}>
            <Body size={13} style={{ marginBottom: 8 }}>{field.label}</Body>
            <View style={styles.chips}>
              {field.options.map((opt) => {
                const on = field.current === opt;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => setDraft({ ...draft, ...field.apply(opt) })}
                    style={[
                      styles.chip,
                      {
                        borderColor: on ? C.mahHi : 'rgba(240,225,210,.14)',
                        backgroundColor: on ? '#2F2417' : C.card,
                      },
                    ]}
                  >
                    <Text style={[styles.chipLabel, { color: on ? '#CFAE87' : C.muted }]}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        <PrimaryButton
          label="Save tags"
          onPress={() => {
            const saved = { ...draft, needsReview: false };
            saved.description = describeGarment(saved);
            onSave(saved);
          }}
          style={{ marginTop: 6 }}
        />
        <Pressable onPress={() => onDelete(draft.id)} style={styles.remove}>
          <Text style={styles.removeLabel}>Remove from closet</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { height: 250, overflow: 'hidden' },
  back: {
    position: 'absolute',
    left: 18,
    width: 38,
    height: 38,
    borderRadius: 99,
    backgroundColor: 'rgba(18,11,7,.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backLabel: { color: C.textSoft, fontSize: 17, fontFamily: F.sans },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 99, borderWidth: 1.5 },
  chipLabel: { fontFamily: F.sans, fontSize: 13.5 },
  remove: { alignItems: 'center', paddingVertical: 18 },
  removeLabel: { fontFamily: F.sans, fontSize: 14, color: C.faint },
});
