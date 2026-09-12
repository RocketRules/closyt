import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Closyt, Spacing } from '@/constants/theme';

export function Screen({
  title,
  subtitle,
  step,
  children,
  footer,
  onBack,
  showBack = true,
  scroll = true,
}: {
  title: string;
  subtitle?: string;
  step?: string;
  children: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
  showBack?: boolean;
  scroll?: boolean;
}) {
  const back =
    showBack === false
      ? undefined
      : (onBack ?? (router.canGoBack() ? () => router.back() : undefined));
  const body = (
    <View style={styles.body}>
      <View style={styles.header}>
        <View style={styles.topRow}>
          {back ? (
            <Pressable onPress={back} hitSlop={12} accessibilityRole="button">
              <Text style={styles.back}>Back</Text>
            </Pressable>
          ) : (
            <View />
          )}
          {step ? <Text style={styles.step}>{step}</Text> : <View />}
        </View>
        <Text style={styles.brand}>CLOSYT</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {body}
          </ScrollView>
        ) : (
          <View style={styles.flex}>{body}</View>
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Closyt.paper,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingBottom: Spacing.four,
    flexGrow: 1,
  },
  body: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.four,
  },
  header: {
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  back: {
    color: Closyt.muted,
    fontWeight: '600',
  },
  step: {
    color: Closyt.muted,
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: '700',
  },
  brand: {
    color: Closyt.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    color: Closyt.ink,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '700',
  },
  subtitle: {
    color: Closyt.muted,
    fontSize: 16,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    paddingTop: Spacing.two,
    gap: 10,
    backgroundColor: Closyt.paper,
  },
});
