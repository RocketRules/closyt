import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen, Display, Mono, Body, PrimaryButton, Card } from '../components/ui';
import { C, F } from '../theme/theme';

const GENDERS = ['Woman', 'Man', 'Non-binary', 'Prefer not to say'];

export default function BasicsScreen({ draft, onChange, onDone }) {
  const [step, setStep] = useState(1);
  const insets = useSafeAreaInsets();
  const { gender, age, height, weight, hUnit, wUnit } = draft;

  const heightLabel =
    hUnit === 'cm'
      ? `${height} cm`
      : `${Math.floor(height / 30.48)}′ ${Math.round((height / 2.54) % 12)}″`;
  const weightLabel = wUnit === 'kg' ? `${weight} kg` : `${Math.round(weight * 2.2046)} lb`;

  return (
    <Screen style={{ paddingHorizontal: 24, paddingTop: insets.top + 20 }}>
      <View style={styles.steps}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={[styles.step, { backgroundColor: step >= n ? C.mahHi : C.track }]} />
        ))}
      </View>

      <Mono size={11} color={C.ember} style={{ marginBottom: 10 }}>
        Step {step} of 3
      </Mono>
      <Display size={32} style={{ marginBottom: 24 }}>
        {step === 1 ? 'A little about you' : 'Your measurements'}
      </Display>

      {step === 1 ? (
        <>
          <View style={{ gap: 10 }}>
            {GENDERS.map((g) => {
              const on = gender === g;
              return (
                <Pressable
                  key={g}
                  onPress={() => onChange({ gender: g })}
                  style={[
                    styles.option,
                    { borderColor: on ? C.mahHi : C.hairlineSoft, backgroundColor: on ? '#2F2417' : C.card },
                  ]}
                >
                  <Text style={styles.optionLabel}>{g}</Text>
                  <View style={[styles.dot, { backgroundColor: on ? C.ember : C.track }]} />
                </Pressable>
              );
            })}
          </View>
          <Card style={{ marginTop: 24, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderRadius: 18 }}>
            <View style={styles.rowBaseline}>
              <Body size={14}>Age</Body>
              <Display size={28}>{age}</Display>
            </View>
            <Slider
              minimumValue={16}
              maximumValue={75}
              step={1}
              value={age}
              onValueChange={(v) => onChange({ age: Math.round(v) })}
              minimumTrackTintColor={C.mahHi}
              maximumTrackTintColor={C.track}
              thumbTintColor={C.ember}
            />
          </Card>
        </>
      ) : (
        <View style={{ gap: 14 }}>
          <Measure
            label="Height"
            value={heightLabel}
            units={['cm', 'ft/in']}
            unit={hUnit}
            onUnit={(u) => onChange({ hUnit: u })}
            min={140}
            max={205}
            raw={height}
            onRaw={(v) => onChange({ height: v })}
          />
          <Measure
            label="Weight"
            value={weightLabel}
            units={['kg', 'lb']}
            unit={wUnit}
            onUnit={(u) => onChange({ wUnit: u })}
            min={40}
            max={140}
            raw={weight}
            onRaw={(v) => onChange({ weight: v })}
          />
          <Body size={13} color={C.faint}>
            Used only to judge fit and proportion. Never shared.
          </Body>
        </View>
      )}

      <View style={{ flex: 1 }} />
      <PrimaryButton
        label="Continue"
        onPress={() => (step === 1 ? setStep(2) : onDone())}
        style={{ marginBottom: 40 + insets.bottom }}
      />
    </Screen>
  );
}

function Measure({ label, value, units, unit, onUnit, min, max, raw, onRaw }) {
  return (
    <Card style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderRadius: 18 }}>
      <View style={[styles.rowBaseline, { alignItems: 'center', marginBottom: 8 }]}>
        <Body size={14}>{label}</Body>
        <View style={styles.segment}>
          {units.map((u) => {
            const on = unit === u;
            return (
              <Pressable
                key={u}
                onPress={() => onUnit(u)}
                style={[styles.segmentBtn, { backgroundColor: on ? C.mah : 'transparent' }]}
              >
                <Text style={[styles.segmentLabel, { color: on ? '#F7EEDF' : C.dim }]}>{u}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Display size={26} style={{ marginBottom: 2 }}>
        {value}
      </Display>
      <Slider
        minimumValue={min}
        maximumValue={max}
        step={1}
        value={raw}
        onValueChange={(v) => onRaw(Math.round(v))}
        minimumTrackTintColor={C.mahHi}
        maximumTrackTintColor={C.track}
        thumbTintColor={C.ember}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', gap: 6, marginBottom: 26 },
  step: { flex: 1, height: 4, borderRadius: 99 },
  option: {
    height: 56,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLabel: { fontFamily: F.sans, fontSize: 16, color: C.textSoft },
  dot: { width: 11, height: 11, borderRadius: 99 },
  rowBaseline: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  segment: { flexDirection: 'row', gap: 4, padding: 3, borderRadius: 99, backgroundColor: C.sunken },
  segmentBtn: { borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5 },
  segmentLabel: { fontFamily: F.mono, fontSize: 10.5, letterSpacing: 0.6, textTransform: 'uppercase' },
});
