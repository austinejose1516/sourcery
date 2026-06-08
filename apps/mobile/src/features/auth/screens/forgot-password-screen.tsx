import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@recipeer/core';

import { FadeInUp } from '@/components/motion/fade-in-up';
import { BackButton, Button, Icon, Screen, Text, TextField } from '@/components/ui';
import { useZodForm } from '@/lib/use-zod-form';
import { AuthError } from '@/services/auth';

import { AuthHeader } from '../components/auth-header';
import { useSendPasswordReset } from '../hooks';
import { forgotPasswordSchema, type ForgotPasswordValues } from '../schema';

const INITIAL: ForgotPasswordValues = { email: '' };

export function ForgotPasswordScreen() {
  const router = useRouter();
  const form = useZodForm(forgotPasswordSchema, INITIAL);
  const reset = useSendPasswordReset();

  const onSubmit = () => {
    const values = form.validate();
    if (!values) return;
    reset.mutate(values.email);
  };

  const submitError = reset.error instanceof AuthError ? reset.error.message : null;

  return (
    <Screen scroll contentStyle={styles.content}>
      <BackButton />

      <FadeInUp>
        <AuthHeader
          title="Reset your password."
          subtitle="Pop in your email and we'll send a one-tap link. No need to remember anything."
        />
      </FadeInUp>

      {reset.isSuccess ? (
        <FadeInUp style={styles.successCard}>
          <Icon name="checkmark-circle" size={28} color="herb" />
          <Text variant="bodyStrong">Check your inbox</Text>
          <Text variant="caption" color="textSecondary" align="center">
            If an account exists for {form.values.email}, a reset link is on its way.
          </Text>
          <Button label="Back to sign in" variant="secondary" onPress={() => router.back()} />
        </FadeInUp>
      ) : (
        <FadeInUp delay={80} style={styles.form}>
          <TextField
            label="Email"
            value={form.values.email}
            onChangeText={(v) => form.setField('email', v)}
            error={form.errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="done"
            onSubmitEditing={onSubmit}
          />

          {submitError ? (
            <Text variant="caption" color="danger">
              {submitError}
            </Text>
          ) : null}

          <Button label="Send reset link" onPress={onSubmit} loading={reset.isPending} />

          <View style={styles.note}>
            <Text variant="caption" color="textSecondary">
              If you signed up with Apple or Google, head back and use that button instead — you
              don&apos;t have a password to reset.
            </Text>
          </View>
        </FadeInUp>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingVertical: spacing.lg },
  form: { gap: spacing.lg },
  note: {
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  successCard: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
