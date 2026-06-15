import { Image, StyleSheet, View } from 'react-native';
import type { MyRecipeCardDTO, ProcessingJobDTO } from '@recipeer/core';
import { colors, radius, spacing } from '@recipeer/core';

import { Icon, PressableScale, Text } from '@/components/ui';

/** Human stage label + whether the job is still working, from its status. */
export function jobStage(status: ProcessingJobDTO['status']): { label: string; working: boolean } {
  switch (status) {
    case 'UPLOADING':
      return { label: 'Uploading', working: true };
    case 'TRANSCRIBING':
    case 'STRUCTURING':
      return { label: 'Watching & listening', working: true };
    case 'TRANSLATING':
      return { label: 'Writing it up', working: true };
    case 'REVIEW':
      return { label: 'Almost ready', working: true };
    case 'FAILED':
      return { label: 'Something went wrong', working: false };
    default:
      return { label: 'Ready', working: false };
  }
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
      <Icon name={icon} size={20} color="textSecondary" />
    </View>
  );
}

export function ProcessingRow({ job, onPress }: { job: ProcessingJobDTO; onPress: () => void }) {
  const stage = jobStage(job.status);
  const isLink = job.sourceType === 'LINK';
  return (
    <PressableScale style={styles.row} onPress={onPress}>
      <Thumb uri={null} icon={isLink ? 'link' : 'videocam'} />
      <View style={styles.rowBody}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {job.title ?? (isLink ? 'Imported video' : 'Untitled upload')}
        </Text>
        <Text variant="caption" color={job.status === 'FAILED' ? 'danger' : 'textSecondary'}>
          {stage.label}
          {stage.working ? ' · we’ll notify you' : ''}
        </Text>
      </View>
      {stage.working ? (
        <Icon name="ellipsis-horizontal" size={18} color="textSecondary" />
      ) : (
        <Icon name="refresh" size={18} color="primary" />
      )}
    </PressableScale>
  );
}

export function RecipeRow({ recipe, onPress }: { recipe: MyRecipeCardDTO; onPress: () => void }) {
  const needsReview = recipe.status === 'DRAFT';
  const isPrivate = recipe.visibility === 'PRIVATE';
  return (
    <PressableScale style={styles.row} onPress={onPress}>
      <Thumb uri={recipe.coverImageUrl} icon={recipe.isLinkImport ? 'link' : 'restaurant'} />
      <View style={styles.rowBody}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {recipe.title || 'Untitled recipe'}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {needsReview
            ? 'Tap to review'
            : isPrivate
              ? recipe.isLinkImport
                ? 'Imported · private'
                : 'Only visible to you'
              : 'Published'}
        </Text>
      </View>
      {needsReview ? (
        <Text variant="caption" color="primary">
          Review →
        </Text>
      ) : (
        <Icon name="chevron-forward" size={18} color="textSecondary" />
      )}
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
  thumb: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
});
