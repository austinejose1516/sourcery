import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@recipeer/core';

import { FadeInUp } from '@/components/motion/fade-in-up';
import { Button, Icon, Screen, Text } from '@/components/ui';
import { FlowHeader } from '@/features/recipes/flow-header';

export default function ComingSoonScreen() {
  const router = useRouter();
  return (
    <Screen keyboardAvoiding={false}>
      <FlowHeader />
      <FadeInUp style={styles.center}>
        <View style={styles.iconBubble}>
          <Icon name="construct" size={28} color="primary" />
        </View>
        <Text variant="heading" align="center">
          Coming soon
        </Text>
        <Text variant="body" color="textSecondary" align="center" style={styles.note}>
          This way of adding a recipe isn’t ready yet. For now, upload a video or paste a YouTube link.
        </Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </FadeInUp>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  iconBubble: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { paddingHorizontal: spacing.lg },
});
