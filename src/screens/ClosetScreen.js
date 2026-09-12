import React from 'react';
import { View, ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Display, Mono, Body } from '../components/ui';
import ItemThumb from '../components/ItemThumb';
import { C, F } from '../theme/theme';

export default function ClosetScreen({ items, onAdd, onOpen }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, paddingTop: insets.top + 14 }}>
      <View style={styles.header}>
        <Display size={30}>Closet</Display>
        <Mono size={10.5}>{`${items.length} item${items.length === 1 ? '' : 's'}`}</Mono>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          <Pressable onPress={onAdd} style={({ pressed }) => [styles.add, pressed && { backgroundColor: '#31261A' }]}>
            <Text style={styles.plus}>+</Text>
            <Body size={13.5} color={C.ember}>Add item</Body>
          </Pressable>
          {items.map((item) => (
            <Pressable key={item.id} onPress={() => onOpen(item)} style={styles.tile}>
              <View style={styles.thumbWrap}>
                <ItemThumb item={item} radius={0} style={StyleSheet.absoluteFill} />
                {item.needsReview && (
                  <View style={styles.badge}>
                    <Mono size={8.5} color="#CFAE87">check tags</Mono>
                  </View>
                )}
              </View>
              <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12 }}>
                <Text style={styles.type} numberOfLines={1}>{item.type}</Text>
                <Mono size={10} style={{ marginTop: 4 }}>{item.colorName}</Mono>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 22,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  scroll: { paddingHorizontal: 22, paddingTop: 4, paddingBottom: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  add: {
    width: '47.4%',
    aspectRatio: 0.84,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(188,150,112,.5)',
    backgroundColor: C.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  plus: { fontSize: 32, lineHeight: 36, color: C.ember, fontFamily: F.sans },
  tile: {
    width: '47.4%',
    borderWidth: 1,
    borderColor: C.hairline,
    backgroundColor: C.card,
    borderRadius: 20,
    overflow: 'hidden',
  },
  thumbWrap: { width: '100%', aspectRatio: 1.12 },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: C.cardAlt,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 99,
  },
  type: { fontFamily: F.sansMed, fontSize: 14, color: C.textSoft },
});
