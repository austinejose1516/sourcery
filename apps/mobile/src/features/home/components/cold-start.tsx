import { ScrollView, StyleSheet, View } from 'react-native';
import { spacing } from '@recipeer/core';

import { FadeInUp } from '@/components/motion/fade-in-up';
import { Hairline, Text } from '@/components/ui';
import { useMostLoved, useSuggestions, useToggleFollow } from '../hooks';
import { MostLovedCard } from './most-loved-card';
import { SuggestedCookRow } from './suggested-cook-row';

/**
 * Empty-feed onboarding state: a hero nudge, a list of cooks the viewer can
 * follow, and a rail of the community's most-loved recipes.
 */
export function ColdStart() {
  const suggestions = useSuggestions();
  const mostLoved = useMostLoved();
  const toggleFollow = useToggleFollow();
  const pendingId = toggleFollow.isPending ? toggleFollow.variables?.cookId : undefined;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <FadeInUp style={styles.hero}>
        <Text variant="display">🍲</Text>
        <Text variant="title">Follow cooks to fill your feed</Text>
        <Text variant="body" color="textSecondary">
          Based on your tastes, here are cooks you’ll probably love.
        </Text>
      </FadeInUp>

      <FadeInUp delay={80} style={styles.section}>
        <Text variant="heading">Cooks to follow</Text>
        <View style={styles.list}>
          {suggestions.data?.map((cook, i) => (
            <View key={cook.id}>
              {i > 0 ? <Hairline /> : null}
              <View style={styles.cookRow}>
                <SuggestedCookRow
                  cook={cook}
                  pending={pendingId === cook.id}
                  onToggleFollow={() =>
                    toggleFollow.mutate({ cookId: cook.id, isFollowing: cook.isFollowing })
                  }
                />
              </View>
            </View>
          ))}
          {suggestions.isSuccess && suggestions.data.length === 0 ? (
            <Text variant="body" color="textSecondary">
              No suggestions right now — check back soon.
            </Text>
          ) : null}
        </View>
      </FadeInUp>

      {mostLoved.data && mostLoved.data.length > 0 ? (
        <FadeInUp delay={160} style={styles.section}>
          <Text variant="heading">Our most-loved recipes</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rail}>
            {mostLoved.data.map((recipe) => (
              <MostLovedCard key={recipe.id} recipe={recipe} />
            ))}
          </ScrollView>
        </FadeInUp>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.xxl },
  hero: { gap: spacing.sm, paddingTop: spacing.lg },
  section: { gap: spacing.md },
  list: { gap: spacing.sm },
  cookRow: { paddingVertical: spacing.sm },
  rail: { gap: spacing.md, paddingRight: spacing.xl },
});
