import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors, sizing, spacing } from '@recipeer/core';

export interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView (for forms / long content). */
  scroll?: boolean;
  /** Lift content above the keyboard. Defaults to true. */
  keyboardAvoiding?: boolean;
  /** Safe-area edges to apply. Defaults to top + bottom. */
  edges?: readonly Edge[];
  contentStyle?: ViewStyle;
}

/**
 * App-wide page shell: themed background, safe-area insets, keyboard avoidance,
 * and a centred max-width content column (so it reads well on tablets/web too).
 */
export function Screen({
  children,
  scroll = false,
  keyboardAvoiding = true,
  edges = ['top', 'bottom'],
  contentStyle,
}: ScreenProps) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, contentStyle]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.flex, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: sizing.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
  },
});
