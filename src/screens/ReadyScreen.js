import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen, Display, Body, PrimaryButton } from '../components/ui';
import { C, F } from '../theme/theme';

export default function ReadyScreen({ onEnter }) {
  return (
    <Screen style={styles.wrap} wood woodSeed={5}>
      <View style={styles.check}>
        <Text style={styles.tick}>✓</Text>
      </View>
      <Display size={32}>Body profile ready</Display>
      <Body size={15} style={{ textAlign: 'center', maxWidth: 264 }}>
        We'll use it to judge drape, length and proportion on every outfit.
      </Body>
      <PrimaryButton label="Open Closyt" onPress={onEnter} style={{ marginTop: 12, paddingHorizontal: 34 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, paddingBottom: 40, gap: 14 },
  check: {
    width: 68,
    height: 68,
    borderRadius: 99,
    backgroundColor: '#33221A',
    borderWidth: 1,
    borderColor: 'rgba(188,150,112,.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: { fontSize: 28, color: C.ember, fontFamily: F.sans },
});
