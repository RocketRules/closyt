import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Closyt, Spacing } from '@/constants/theme';
import { useAppState } from '@/store/AppState';

export default function OutfitsScreen() {
  const { outfits, wardrobe, composeLooks, composing, outfitsSource } = useAppState();
  const byId = Object.fromEntries(wardrobe.map((item) => [item.id, item]));

  return (
    <Screen
      step="5 / 5"
      title="Looks from your closet"
      subtitle="Picked to flatter your proportions. Every piece is something you already own.">
      {outfitsSource === 'fallback' ? (
        <Text style={styles.note}>Assembled with the on-device fallback so the demo never blanks.</Text>
      ) : null}

      {outfits.length === 0 ? (
        <Text style={styles.note}>No looks yet. Go back to the closet and tap Make outfits.</Text>
      ) : (
        outfits.map((look) => {
          const pieces = look.itemIds.map((id) => byId[id]).filter(Boolean);
          return (
            <View
              key={look.id}
              style={styles.card}
              accessibilityRole="summary"
              accessibilityLabel={`${look.title}. ${pieces.map((piece) => piece.label).join(', ')}. ${look.why}`}>
              <View style={styles.photos}>
                {pieces.map((piece) => (
                  <Image
                    key={piece.id}
                    source={{ uri: piece.photoUri }}
                    style={styles.photo}
                    contentFit="cover"
                  />
                ))}
              </View>
              <Text style={styles.kicker}>{look.occasion}</Text>
              <Text style={styles.title}>{look.title}</Text>
              <Text style={styles.pieces}>
                {pieces.map((piece) => piece.label).join(' · ')}
              </Text>
              <Text style={styles.why}>{look.why}</Text>
            </View>
          );
        })
      )}

      <Button
        label={composing ? 'Refreshing looks…' : 'Regenerate'}
        variant="secondary"
        disabled={composing}
        onPress={() => void composeLooks()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: {
    color: Closyt.muted,
    lineHeight: 22,
  },
  card: {
    backgroundColor: Closyt.card,
    borderRadius: 28,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Closyt.line,
    gap: 8,
  },
  photos: {
    flexDirection: 'row',
    gap: 8,
  },
  photo: {
    flex: 1,
    height: 140,
    borderRadius: 16,
    backgroundColor: Closyt.accentSoft,
  },
  kicker: {
    marginTop: 6,
    color: Closyt.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Closyt.ink,
  },
  pieces: {
    color: Closyt.muted,
    lineHeight: 20,
  },
  why: {
    color: Closyt.ink,
    fontSize: 15,
    lineHeight: 22,
  },
});
