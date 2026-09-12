import { router } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Chip, Field } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Closyt } from '@/constants/theme';
import { useAppState } from '@/store/AppState';

export default function MeasurementsScreen() {
  const { draft, setDraft, parsedMeasurements, measurementError } = useAppState();
  const canContinue = Boolean(draft.presentation && parsedMeasurements && !measurementError);

  return (
    <Screen
      step="2 / 5"
      title="Height and weight"
      subtitle="We’ll use these for fit and proportion. Nothing here is shown as a body-type label."
      footer={
        <Button
          label="Continue"
          disabled={!canContinue}
          onPress={() => router.push('/selfie')}
        />
      }>
      <Field label="Height">
        <View style={styles.row}>
          <Chip
            label="ft / in"
            selected={draft.heightUnit === 'ft'}
            onPress={() => setDraft({ heightUnit: 'ft' })}
          />
          <Chip
            label="cm"
            selected={draft.heightUnit === 'cm'}
            onPress={() => setDraft({ heightUnit: 'cm' })}
          />
        </View>
        {draft.heightUnit === 'cm' ? (
          <TextInput
            value={draft.heightCm}
            onChangeText={(heightCm) => setDraft({ heightCm })}
            keyboardType="decimal-pad"
            placeholder="170"
            placeholderTextColor={Closyt.muted}
            style={styles.input}
          />
        ) : (
          <View style={styles.row}>
            <TextInput
              value={draft.heightFt}
              onChangeText={(heightFt) => setDraft({ heightFt })}
              keyboardType="number-pad"
              placeholder="5"
              placeholderTextColor={Closyt.muted}
              style={[styles.input, styles.flex]}
            />
            <Text style={styles.unit}>ft</Text>
            <TextInput
              value={draft.heightIn}
              onChangeText={(heightIn) => setDraft({ heightIn })}
              keyboardType="decimal-pad"
              placeholder="8"
              placeholderTextColor={Closyt.muted}
              style={[styles.input, styles.flex]}
            />
            <Text style={styles.unit}>in</Text>
          </View>
        )}
      </Field>

      <Field label="Weight">
        <View style={styles.row}>
          <Chip
            label="lb"
            selected={draft.weightUnit === 'lb'}
            onPress={() => setDraft({ weightUnit: 'lb' })}
          />
          <Chip
            label="kg"
            selected={draft.weightUnit === 'kg'}
            onPress={() => setDraft({ weightUnit: 'kg' })}
          />
        </View>
        <TextInput
          value={draft.weight}
          onChangeText={(weight) => setDraft({ weight })}
          keyboardType="decimal-pad"
          placeholder={draft.weightUnit === 'lb' ? '150' : '68'}
          placeholderTextColor={Closyt.muted}
          style={styles.input}
        />
      </Field>

      {measurementError ? <Text style={styles.error}>{measurementError}</Text> : null}
      <Text style={styles.hint}>We’ll use this for fit — no body-type name on screen.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flex: {
    flex: 1,
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Closyt.line,
    backgroundColor: Closyt.card,
    paddingHorizontal: 16,
    color: Closyt.ink,
    fontSize: 18,
  },
  unit: {
    color: Closyt.muted,
    fontWeight: '600',
  },
  error: {
    color: Closyt.accent,
    fontWeight: '600',
  },
  hint: {
    color: Closyt.muted,
  },
});
