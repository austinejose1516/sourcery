import { type Href, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@recipeer/core';

import { FadeInUp } from '@/components/motion/fade-in-up';
import { Icon, type IconName, PressableScale, Screen, Text } from '@/components/ui';
import { FlowHeader } from '@/features/recipes/flow-header';

interface Method {
  icon: IconName;
  title: string;
  subtitle: string;
  href: Href;
}

// Two paths are live now; the rest route to a shared "coming soon" screen.
const METHODS: Method[] = [
  { icon: 'cloud-upload', title: 'Upload a video', subtitle: 'From your camera roll or files.', href: '/new-recipe/upload' },
  { icon: 'link', title: 'Paste a YouTube link', subtitle: 'Import a single video by URL.', href: '/new-recipe/youtube' },
  { icon: 'videocam', title: 'Record a recipe', subtitle: 'Film while you cook. We write it up.', href: '/coming-soon' },
  { icon: 'mic', title: 'Talk it through', subtitle: 'No camera — just describe it out loud.', href: '/coming-soon' },
  { icon: 'logo-youtube', title: 'Connect YouTube', subtitle: 'Pick several of your uploads at once.', href: '/coming-soon' },
  { icon: 'create', title: 'Write it manually', subtitle: 'Type the ingredients and steps.', href: '/coming-soon' },
];

export default function NewRecipeScreen() {
  const router = useRouter();
  return (
    <Screen scroll keyboardAvoiding={false}>
      <FlowHeader />
      <FadeInUp style={styles.intro}>
        <Text variant="display">How would you like to add it?</Text>
        <Text variant="body" color="textSecondary">
          Every way ends the same: you review the written-up recipe before it goes anywhere.
        </Text>
      </FadeInUp>

      <View style={styles.list}>
        {METHODS.map((m, i) => (
          <FadeInUp key={m.title} delay={60 + i * 40}>
            <PressableScale style={styles.card} onPress={() => router.push(m.href)}>
              <View style={styles.iconWrap}>
                <Icon name={m.icon} size={22} color="primary" />
              </View>
              <View style={styles.cardBody}>
                <Text variant="bodyStrong">{m.title}</Text>
                <Text variant="caption" color="textSecondary">
                  {m.subtitle}
                </Text>
              </View>
              <Icon name="chevron-forward" size={18} color="textSecondary" />
            </PressableScale>
          </FadeInUp>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: spacing.sm, paddingBottom: spacing.xl },
  list: { gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: spacing.xxs },
});
