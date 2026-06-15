import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ProcessingJobDTO } from '@recipeer/core';
import { colors, radius, spacing } from '@recipeer/core';

import { FadeInUp } from '@/components/motion/fade-in-up';
import { Button, Icon, Screen, Text } from '@/components/ui';
import { FlowHeader } from '@/features/recipes/flow-header';
import { useJob } from '@/features/recipes/hooks';

const STAGES = ['Uploaded', 'Watching & listening', 'Writing ingredients & steps', 'Almost ready'];

function stageIndex(status: ProcessingJobDTO['status']): number {
  switch (status) {
    case 'UPLOADING':
      return 0;
    case 'TRANSCRIBING':
    case 'STRUCTURING':
      return 1;
    case 'TRANSLATING':
      return 2;
    case 'REVIEW':
    case 'COMPLETE':
      return 3;
    default:
      return 0;
  }
}

export default function ProcessingScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { data: job, isError } = useJob(jobId);

  // Once a recipe exists, jump straight into review.
  useEffect(() => {
    if (job?.recipeId && job.status === 'COMPLETE') {
      router.replace({ pathname: '/review/[recipeId]', params: { recipeId: job.recipeId } });
    }
  }, [job?.recipeId, job?.status, router]);

  const failed = job?.status === 'FAILED';
  const current = job ? stageIndex(job.status) : 0;

  return (
    <Screen keyboardAvoiding={false}>
      <FlowHeader />
      {failed ? (
        <FadeInUp style={styles.center}>
          <View style={[styles.iconBubble, styles.iconBubbleError]}>
            <Icon name="alert-circle" size={28} color="danger" />
          </View>
          <Text variant="heading" align="center">
            We couldn’t finish this one
          </Text>
          <Text variant="body" color="textSecondary" align="center" style={styles.note}>
            {job?.errorMessage ?? 'Something went wrong while writing up your recipe.'}
          </Text>
          <Button label="Back to My Recipes" onPress={() => router.replace('/my-recipes')} />
        </FadeInUp>
      ) : (
        <FadeInUp style={styles.top}>
          <Text variant="display">Making your recipe</Text>
          <Text variant="body" color="textSecondary">
            This usually takes a couple of minutes. We’ll keep working in the background and notify you the moment it’s
            ready to review.
          </Text>

          <View style={styles.stages}>
            {STAGES.map((label, i) => {
              const done = i < current || job?.status === 'COMPLETE';
              const active = i === current && !done;
              return (
                <View key={label} style={styles.stage}>
                  <View style={styles.stageIcon}>
                    {done ? (
                      <Icon name="checkmark-circle" size={22} color="herb" />
                    ) : active ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <Icon name="ellipse-outline" size={22} color="border" />
                    )}
                  </View>
                  <Text variant="body" color={done || active ? 'textPrimary' : 'textSecondary'}>
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>

          {isError ? (
            <Text variant="caption" color="textSecondary">
              Lost connection — still working. This screen will catch up.
            </Text>
          ) : null}

          <Button label="Leave — we’ll notify you" variant="secondary" onPress={() => router.replace('/my-recipes')} />
        </FadeInUp>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flex: 1, gap: spacing.md, paddingTop: spacing.sm },
  stages: { gap: spacing.lg, paddingVertical: spacing.xl },
  stage: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stageIcon: { width: 24, alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  iconBubble: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubbleError: { backgroundColor: colors.surfaceMuted },
  note: { paddingHorizontal: spacing.lg },
});
