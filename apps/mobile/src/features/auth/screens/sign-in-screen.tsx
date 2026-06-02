import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { spacing } from '@sourcery/core';

import { FadeInUp } from '@/components/motion/fade-in-up';
import { BackButton, Button, Screen, Text, TextField } from '@/components/ui';
import { AuthError } from '@/services/auth';

import { AuthHeader } from '../components/auth-header';
import { SocialAuthGroup } from '../components/social-auth-group';
import { useSignIn } from '../hooks';
import { signInSchema, type SignInValues } from '../schema';
import { useZodForm } from '@/lib/use-zod-form';

const INITIAL: SignInValues = { email: '', password: '' };

export function SignInScreen() {
  const router = useRouter();
  const form = useZodForm(signInSchema, INITIAL);
  const signIn = useSignIn();

  const onSubmit = () => {
    const values = form.validate();
    if (!values) return;
    signIn.mutate(values, { onSuccess: () => router.replace('/home') });
  };

  const submitError = signIn.error instanceof AuthError ? signIn.error.message : null;

  return (
    <Screen scroll contentStyle={styles.content}>
      <BackButton />

      <FadeInUp>
        <AuthHeader title="Welcome back." subtitle="Your kitchen and saved recipes are waiting." />
      </FadeInUp>

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
          returnKeyType="next"
        />
        <TextField
          label="Password"
          value={form.values.password}
          onChangeText={(v) => form.setField('password', v)}
          error={form.errors.password}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />

        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          style={styles.forgot}
          onPress={() => router.push('/forgot-password')}>
          <Text variant="label" color="primary">
            Forgot password?
          </Text>
        </Pressable>

        {submitError ? (
          <Text variant="caption" color="danger">
            {submitError}
          </Text>
        ) : null}

        <Button label="Sign in" onPress={onSubmit} loading={signIn.isPending} />
      </FadeInUp>

      <FadeInUp delay={160}>
        <SocialAuthGroup providers={['apple']} />
      </FadeInUp>

      <FadeInUp delay={220}>
        <View style={styles.footer}>
          <Text variant="caption" color="textSecondary">
            New here?{' '}
          </Text>
          <Pressable hitSlop={8} onPress={() => router.replace('/create-kitchen')}>
            <Text variant="label" color="primary">
              Make a kitchen
            </Text>
          </Pressable>
        </View>
      </FadeInUp>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingVertical: spacing.lg },
  form: { gap: spacing.lg },
  forgot: { alignSelf: 'flex-end' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
