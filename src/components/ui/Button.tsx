import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';

import { Closyt } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost';

export function Button({
  label,
  variant = 'primary',
  disabled,
  ...rest
}: PressableProps & { label: string; variant?: Variant }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        (disabled || pressed) && styles.pressed,
        disabled && styles.disabled,
      ]}
      {...rest}>
      <Text
        style={[
          styles.label,
          variant === 'primary' && styles.primaryLabel,
          variant !== 'primary' && styles.inkLabel,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  primary: {
    backgroundColor: Closyt.ink,
  },
  secondary: {
    backgroundColor: Closyt.card,
    borderWidth: 1,
    borderColor: Closyt.line,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryLabel: {
    color: Closyt.paper,
  },
  inkLabel: {
    color: Closyt.ink,
  },
});

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[stylesChip.chip, selected && stylesChip.selected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}>
      <Text style={[stylesChip.text, selected && stylesChip.selectedText]}>{label}</Text>
    </Pressable>
  );
}

const stylesChip = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Closyt.line,
    backgroundColor: Closyt.card,
  },
  selected: {
    backgroundColor: Closyt.ink,
    borderColor: Closyt.ink,
  },
  text: {
    color: Closyt.ink,
    fontWeight: '600',
  },
  selectedText: {
    color: Closyt.paper,
  },
});

export function Field({
  children,
  label,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: Closyt.muted, fontSize: 13, fontWeight: '600', letterSpacing: 0.6 }}>
        {label.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}
