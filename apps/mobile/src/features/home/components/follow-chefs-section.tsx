import { StyleSheet, View } from 'react-native';
import { spacing } from '@recipeer/core';

import { Hairline, Text } from '@/components/ui';
import { useSuggestions, useToggleFollow } from '../hooks';
import { SuggestedCookRow } from './suggested-cook-row';

/**
 * "Follow chefs" rail at the top of the Activity tab — the top 5 cooks the
 * viewer doesn't follow yet, reusing the cold-start follow row.
 */
export function FollowChefsSection() {
  const suggestions = useSuggestions();
  const toggleFollow = useToggleFollow();
  const pendingId = toggleFollow.isPending ? toggleFollow.variables?.cookId : undefined;

  const cooks = suggestions.data?.filter((c) => !c.isFollowing).slice(0, 5) ?? [];
  if (cooks.length === 0) return null;

  return (
    <View style={styles.section}>
      <Hairline />
      <Text variant="heading" style={styles.heading}>
        Follow chefs
      </Text>
      <View style={styles.list}>
        {cooks.map((cook, i) => (
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md, paddingTop: spacing.lg },
  heading: { paddingTop: spacing.sm },
  list: { gap: spacing.sm },
  cookRow: { paddingVertical: spacing.sm },
});
