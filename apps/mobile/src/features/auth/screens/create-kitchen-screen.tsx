import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { spacing } from '@recipeer/core';

import { FadeInUp } from '@/components/motion/fade-in-up';
import { BackButton, Button, Screen, Text, TextField } from '@/components/ui';
import { useZodForm } from '@/lib/use-zod-form';
import { AuthError } from '@/services/auth';

import { AuthHeader } from '../components/auth-header';
import { LegalNotice } from '../components/legal-notice';
import { SocialAuthGroup } from '../components/social-auth-group';
import { useSignUp } from '../hooks';
import { signUpSchema, type SignUpValues } from '../schema';

const INITIAL: SignUpValues = { name: '', email: '', password: '' };

export function CreateKitchenScreen() {
  const router = useRouter();
  const form = useZodForm(signUpSchema, INITIAL);
  const signUp = useSignUp();

  const onSubmit = () => {
    const values = form.validate();
    if (!values) return;
    signUp.mutate(values, { onSuccess: () => router.replace('/permissions') });
  };

  const submitError = signUp.error instanceof AuthError ? signUp.error.message : null;

  return (
    <Screen scroll contentStyle={styles.content}>
      <BackButton />

      <FadeInUp>
        <AuthHeader
          title="Make a kitchen."
          subtitle="Save recipes, follow cooks, share what you've made."
        />
      </FadeInUp>

      <FadeInUp delay={80} style={styles.form}>
        <TextField
          label="Name"
          value={form.values.name}
          onChangeText={(v) => form.setField('name', v)}
          error={form.errors.name}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
        />
        <TextField
          label="Email"
          value={form.values.email}
          onChangeText={(v) => form.setField('email', v)}
          error={form.errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <TextField
          label="Password"
          value={form.values.password}
          onChangeText={(v) => form.setField('password', v)}
          error={form.errors.password}
          hint="Choose something you'll remember."
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />

        <LegalNotice />

        {submitError ? (
          <Text variant="caption" color="danger">
            {submitError}
          </Text>
        ) : null}

        <Button label="Create account" onPress={onSubmit} loading={signUp.isPending} />
      </FadeInUp>

      <FadeInUp delay={160}>
        <SocialAuthGroup providers={['apple', 'google']} />
      </FadeInUp>

      <FadeInUp delay={220}>
        <View style={styles.footer}>
          <Text variant="caption" color="textSecondary">
            Already have an account?{' '}
          </Text>
          <Text variant="label" color="primary" onPress={() => router.replace('/sign-in')}>
            Sign in
          </Text>
        </View>
      </FadeInUp>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingVertical: spacing.lg },
  form: { gap: spacing.lg },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
