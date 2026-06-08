import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { spacing } from '@recipeer/core';

import { FadeInUp } from '@/components/motion/fade-in-up';
import { Button, Logo, Screen, Text } from '@/components/ui';

export function WelcomeScreen() {
  const router = useRouter();

  return (
    <Screen keyboardAvoiding={false} contentStyle={styles.content}>
      <View style={styles.hero}>
        <FadeInUp>
          <Logo size="lg" style={{ alignSelf: 'center' }} />
        </FadeInUp>

        <FadeInUp delay={80}>
          <Text variant="title" style={styles.headline}>
            Recipes from the cooks who actually make them.
          </Text>
        </FadeInUp>

        <FadeInUp delay={160}>
          <Text variant="body" color="textSecondary">
            Watch home cooks worldwide make their grandmothers&apos; dishes. Cook along. Share what
            you make.
          </Text>
        </FadeInUp>
      </View>

      <FadeInUp delay={240} style={styles.actions}>
        <Button label="Get started" onPress={() => router.push('/create-kitchen')} />
        <Button
          label="I already have an account"
          variant="ghost"
          onPress={() => router.push('/sign-in')}
        />
      </FadeInUp>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'space-between', paddingVertical: spacing.xxxl },
  hero: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  headline: { maxWidth: 320 },
  actions: { gap: spacing.sm },
});
