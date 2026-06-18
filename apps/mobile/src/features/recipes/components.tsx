import { Image, StyleSheet, View } from 'react-native';
import type { MyRecipeCardDTO, ProcessingJobDTO } from '@recipeer/core';
import { colors, radius, spacing } from '@recipeer/core';

import { Button, Icon, PressableScale, Text } from '@/components/ui';

export function jobStage(status: ProcessingJobDTO['status']): {
  label: string;
  eta: string | null;
  working: boolean;
} {
  switch (status) {
    case 'UPLOADING':
      return { label: 'Uploading', eta: '~5 min', working: true };
    case 'TRANSCRIBING':
    case 'STRUCTURING':
      return { label: 'Watching & listening', eta: '~3 min', working: true };
    case 'TRANSLATING':
      return { label: 'Writing it up', eta: '~2 min', working: true };
    case 'REVIEW':
      return { label: 'Almost ready', eta: null, working: true };
    case 'FAILED':
      return { label: 'Something went wrong', eta: null, working: false };
    default:
      return { label: 'Ready', eta: null, working: false };
  }
}

function relativeDate(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Updated today';
  if (days === 1) return 'Updated yesterday';
  if (days < 7) return `Updated ${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return 'Updated a week ago';
  return `Updated ${weeks} weeks ago`;
}

export function SectionHeading({ title, count }: { title: string; count: number }) {
  return (
    <View style={styles.heading}>
      <Text variant="label" color="textSecondary">
        {title}
      </Text>
      <Text variant="label" color="textSecondary">
        {count}
      </Text>
    </View>
  );
}

function Thumb({ uri, icon }: { uri: string | null; icon: Parameters<typeof Icon>[0]['name'] }) {
  if (uri) return <Image source={{ uri }} style={styles.thumb} />;
  return (
    <View style={[styles.thumb, styles.thumbFallback]}>
      <Icon name={icon} size={22} color="textSecondary" />
    </View>
  );
}

export function ProcessingCard({ job, onPress }: { job: ProcessingJobDTO; onPress: () => void }) {
  const stage = jobStage(job.status);
  const isLink = job.sourceType === 'LINK';
  const statusText = stage.eta ? `${stage.label} · ${stage.eta}` : stage.label;
  return (
    <PressableScale style={styles.row} onPress={onPress}>
      <Thumb uri={null} icon={isLink ? 'link' : 'videocam'} />
      <View style={styles.rowBody}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {job.title ?? (isLink ? 'Imported video' : 'Untitled upload')}
        </Text>
        <Text variant="caption" color="textSecondary">
          {statusText}
        </Text>
      </View>
      {stage.working ? (
        <Icon name="ellipsis-horizontal" size={18} color="textSecondary" />
      ) : (
        <Icon name="chevron-forward" size={18} color="primary" />
      )}
    </PressableScale>
  );
}

export function NeedsReviewCard({
  recipe,
  onPress,
}: {
  recipe: MyRecipeCardDTO;
  onPress: () => void;
}) {
  return (
    <View style={styles.reviewWrapper}>
      <PressableScale style={styles.reviewCard} onPress={onPress}>
        <Thumb uri={recipe.coverImageUrl} icon={recipe.isLinkImport ? 'link' : 'restaurant'} />
        <View style={styles.rowBody}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {recipe.title || 'Untitled recipe'}
          </Text>
          <View style={styles.sourceRow}>
            {recipe.isLinkImport ? <Icon name="link" size={13} color="textSecondary" /> : null}
            <Text variant="caption" color="textSecondary">
              {recipe.isLinkImport ? 'Imported · written up & ready' : 'Written up & ready'}
            </Text>
          </View>
        </View>
      </PressableScale>
      <Button label="Review & publish" onPress={onPress} />
    </View>
  );
}

export function PublishedCard({
  recipe,
  onPress,
}: {
  recipe: MyRecipeCardDTO;
  onPress: () => void;
}) {
  return (
    <PressableScale style={styles.row} onPress={onPress}>
      <Thumb uri={recipe.coverImageUrl} icon="restaurant" />
      <View style={styles.rowBody}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {recipe.title || 'Untitled recipe'}
        </Text>
        <Text variant="caption" color="textSecondary">
          {relativeDate(recipe.updatedAt)}
        </Text>
      </View>
      <Icon name="chevron-forward" size={18} color="textSecondary" />
    </PressableScale>
  );
}

export function PrivateDraftCard({
  recipe,
  onPress,
}: {
  recipe: MyRecipeCardDTO;
  onPress: () => void;
}) {
  return (
    <PressableScale style={styles.row} onPress={onPress}>
      <Thumb uri={recipe.coverImageUrl} icon={recipe.isLinkImport ? 'link' : 'restaurant'} />
      <View style={styles.rowBody}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {recipe.title || 'Untitled recipe'}
        </Text>
        <View style={styles.sourceRow}>
          <Icon name="lock-closed" size={13} color="textSecondary" />
          <Text variant="caption" color="textSecondary">
            Only visible to you
          </Text>
        </View>
      </View>
      <Icon name="chevron-forward" size={18} color="textSecondary" />
    </PressableScale>
  );
}

export function FailedCard({
  job,
  onDismiss,
}: {
  job: ProcessingJobDTO;
  onDismiss: () => void;
}) {
  return (
    <PressableScale style={styles.row} onPress={onDismiss}>
      <View style={[styles.thumb, styles.thumbFallback]}>
        <Icon name="warning-outline" size={22} color="danger" />
      </View>
      <View style={styles.rowBody}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {job.title ?? 'Upload failed'}
        </Text>
        <Text variant="caption" color="danger" numberOfLines={2}>
          {job.errorMessage ?? 'Something went wrong'}
        </Text>
      </View>
      <Text variant="caption" color="textSecondary">
        Dismiss
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowBody: { flex: 1, gap: spacing.xxs },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  reviewWrapper: {
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  reviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.md,
  },
});
