import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Closyt, Spacing } from '@/constants/theme';
import { useAppState } from '@/store/AppState';

export default function DoneScreen() {
  const { profile, draft, resetProfile } = useAppState();

  function startOver() {
    resetProfile();
    router.replace('/');
  }

  return (
    <Screen
      step="Done"
      title="Fit profile saved"
      subtitle="Another part of Closyt will use this to put outfits together. Nothing about body type is shown here."
      footer={
        <Button label="Start over" variant="secondary" onPress={startOver} />
      }>
      <View style={styles.card}>
        <Text style={styles.kicker}>Ready to hand off</Text>
        <Text style={styles.body}>
          {draft.selfieUri
            ? 'Measurements and photo are stored on this device as an internal fit profile.'
            : 'Measurements are stored on this device as an internal fit profile. No selfie was attached.'}
        </Text>
        {profile ? (
          <Text style={styles.meta}>
            {profile.presentation} · {profile.heightCm} cm · {profile.weightKg} kg
          </Text>
        ) : (
          <Text style={styles.meta}>No profile yet — go back and finish the selfie step.</Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Closyt.card,
    borderRadius: 24,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Closyt.line,
    gap: 10,
  },
  kicker: {
    color: Closyt.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  body: {
    color: Closyt.ink,
    fontSize: 16,
    lineHeight: 24,
  },
  meta: {
    color: Closyt.muted,
    fontSize: 14,
  },
});
