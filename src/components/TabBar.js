import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { C, F } from '../theme/theme';

const ICONS = {
  recs: {
    path: 'M12 3.2l1.9 4.6 4.9.4-3.7 3.2 1.1 4.8L12 13.7 7.8 16.2l1.1-4.8L5.2 8.2l4.9-.4z M5 19.5h14',
  },
  closet: {
    path: 'M12 8.2V7a2 2 0 1 1 2-2 M12 8.2L3.9 14.6c-.8.6-.4 1.9.6 1.9h15c1 0 1.4-1.3.6-1.9L12 8.2z M8 19.5h8',
  },
  fit: {
    path: 'M3.6 9.4a1.6 1.6 0 0 1 1.6-1.6h1.9l1.2-2h5.4l1.2 2h1.9a1.6 1.6 0 0 1 1.6 1.6v7.2a1.6 1.6 0 0 1-1.6 1.6H5.2a1.6 1.6 0 0 1-1.6-1.6z',
    circle: { cx: 12, cy: 13, r: 3 },
  },
};

const TABS = [
  { key: 'recs', label: 'Today' },
  { key: 'closet', label: 'Closet' },
  { key: 'fit', label: 'Fit Check' },
];

export default function TabBar({ tab, onChange, bottomInset = 0 }) {
  return (
    <View style={[styles.bar, { paddingBottom: 12 + bottomInset }]}>
      {TABS.map((t) => {
        const active = tab === t.key;
        const color = active ? C.ember : C.inactive;
        const icon = ICONS[t.key];
        return (
          <Pressable key={t.key} onPress={() => onChange(t.key)} style={styles.tab}>
            <Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
              <Path
                d={icon.path}
                stroke={color}
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {icon.circle && (
                <Circle {...icon.circle} stroke={color} strokeWidth={1.6} fill="none" />
              )}
            </Svg>
            <Text style={[styles.label, { color }]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(18,11,7,.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(240,225,210,.08)',
  },
  tab: { flex: 1, alignItems: 'center', gap: 5, paddingVertical: 6 },
  label: { fontFamily: F.sans, fontSize: 11 },
});
