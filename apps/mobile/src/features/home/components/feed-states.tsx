import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@recipeer/core';

import { Button, Text } from '@/components/ui';

/** Placeholder cards shown while the feed loads. */
export function FeedSkeleton() {
  return (
    <View style={styles.list}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.card}>
          <View style={styles.image} />
          <View style={styles.body}>
            <View style={[styles.line, { width: '60%' }]} />
            <View style={[styles.line, { width: '90%' }]} />
            <View style={[styles.line, { width: '40%' }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export interface FeedErrorProps {
  message?: string;
  onRetry: () => void;
}

/** Friendly error state with a retry. */
export function FeedError({ message, onRetry }: FeedErrorProps) {
  return (
    <View style={styles.centered}>
      <Text variant="heading" align="center">
        Couldn’t load your feed
      </Text>
      <Text variant="body" color="textSecondary" align="center">
        {message ?? 'Something went wrong.'}
      </Text>
      <Button label="Try again" variant="secondary" fullWidth={false} onPress={onRetry} />
    </View>
  );
}

/** Generic empty message (e.g. a Trending/Tonight feed with no recipes). */
export function FeedEmpty({ message }: { message: string }) {
  return (
    <View style={styles.centered}>
      <Text variant="body" color="textSecondary" align="center">
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.lg, paddingHorizontal: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  image: { width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.surfaceMuted },
  body: { padding: spacing.lg, gap: spacing.sm },
  line: { height: 12, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
});
