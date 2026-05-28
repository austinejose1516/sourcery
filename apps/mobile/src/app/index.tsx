import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius, sizing } from '@sourcery/core';

export default function Welcome() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.wordmark}>Sourcery</Text>
          <Text style={styles.tagline}>
            Home cooking, translated for the world
          </Text>
          <View style={styles.separator} />
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Get started</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.malayalam}>പാചകം</Text>
          <Text style={styles.footerCaption}>paachakam · the art of cooking</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    justifyContent: 'space-between',
  },
  hero: {
    marginTop: spacing.xxxl,
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.fontSize.display,
    lineHeight: typography.lineHeight.display,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  tagline: {
    marginTop: spacing.md,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.body,
    lineHeight: typography.lineHeight.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  separator: {
    marginTop: spacing.xl,
    width: 64,
    height: 1,
    backgroundColor: colors.saffron,
  },
  actions: {
    alignItems: 'center',
  },
  button: {
    height: sizing.buttonHeight,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.pill,
    backgroundColor: colors.buttonPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  pressed: {
    opacity: 0.88,
  },
  buttonText: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.body,
    color: colors.buttonPrimaryText,
  },
  footer: {
    alignItems: 'center',
  },
  malayalam: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.fontSize.h2,
    color: colors.textPrimary,
  },
  footerCaption: {
    marginTop: spacing.xs,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.micro,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
});
