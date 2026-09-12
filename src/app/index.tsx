import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Closyt } from '@/constants/theme';
import { useAppState } from '@/store/AppState';
import type { Presentation } from '@/types';

const OPTIONS: { id: Presentation; title: string; body: string }[] = [
  { id: 'womens', title: 'Women', body: 'Silhouettes, drape, and rise aimed at womenswear.' },
  { id: 'mens', title: 'Men', body: 'Shoulder, drape, and trouser line aimed at menswear.' },
  { id: 'unisex', title: 'Unisex', body: 'Shared cuts. No gendered catalog, just proportion.' },
];

export default function PresentationScreen() {
  const { draft, setDraft } = useAppState();

  return (
    <Screen
      step="1 / 5"
      title="Who are we dressing?"
      subtitle="This only switches the outfit rule book. We never infer it from your photo."
      showBack={false}
      footer={
        <Button
          label="Continue"
          disabled={!draft.presentation}
          onPress={() => router.push('/measurements')}
        />
      }>
      <View style={styles.list}>
        {OPTIONS.map((option) => {
          const selected = draft.presentation === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => setDraft({ presentation: option.id })}
              style={[styles.card, selected && styles.cardSelected]}
              accessibilityRole="button"
              accessibilityState={{ selected }}>
              <Text style={[styles.cardTitle, selected && styles.cardTitleSelected]}>
                {option.title}
              </Text>
              <Text style={[styles.cardBody, selected && styles.cardBodySelected]}>
                {option.body}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: Closyt.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: Closyt.line,
    gap: 6,
  },
  cardSelected: {
    backgroundColor: Closyt.ink,
    borderColor: Closyt.ink,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Closyt.ink,
  },
  cardTitleSelected: {
    color: Closyt.paper,
  },
  cardBody: {
    color: Closyt.muted,
    lineHeight: 20,
  },
  cardBodySelected: {
    color: Closyt.accentSoft,
  },
});
