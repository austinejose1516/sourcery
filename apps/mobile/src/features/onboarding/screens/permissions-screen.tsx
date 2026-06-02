import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { spacing } from '@sourcery/core';

import { FadeInUp } from '@/components/motion/fade-in-up';
import { Button, Screen, Text } from '@/components/ui';
import { type IconName } from '@/components/ui';
import { type ColorToken } from '@sourcery/core';

import { PermissionRow } from '../components/permission-row';

interface PermissionItem {
  icon: IconName;
  tint: ColorToken;
  title: string;
  description: string;
}

const PERMISSIONS: PermissionItem[] = [
  {
    icon: 'camera',
    tint: 'primary',
    title: 'Camera',
    description:
      'So you can record your recipe — and so we can help you check doneness while you cook.',
  },
  {
    icon: 'mic',
    tint: 'herb',
    title: 'Microphone',
    description: 'To capture you talking through the dish, in your own language.',
  },
  {
    icon: 'notifications',
    tint: 'accent',
    title: 'Notifications',
    description: "When someone cooks one of your recipes, you'll know.",
  },
];

export function PermissionsScreen() {
  const router = useRouter();
  const goHome = () => router.replace('/home');

  return (
    <Screen scroll keyboardAvoiding={false} contentStyle={styles.content}>
      <FadeInUp>
        <Text variant="title">A few things we&apos;d like to ask.</Text>
        <Text variant="body" color="textSecondary" style={styles.subtitle}>
          Sourcery only uses these while you&apos;re recording or cooking. You can turn them off any
          time.
        </Text>
      </FadeInUp>

      <View style={styles.list}>
        {PERMISSIONS.map((item, index) => (
          <FadeInUp key={item.title} delay={100 + index * 80}>
            <PermissionRow {...item} />
          </FadeInUp>
        ))}
      </View>

      <FadeInUp delay={100 + PERMISSIONS.length * 80} style={styles.actions}>
        <Button label="Allow & continue" onPress={goHome} />
        <Button label="Not now" variant="ghost" onPress={goHome} />
      </FadeInUp>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl, paddingVertical: spacing.xxl },
  subtitle: { marginTop: spacing.sm },
  list: { gap: spacing.xl },
  actions: { gap: spacing.sm, marginTop: 'auto' },
});
