import { StyleSheet, View } from 'react-native';
import type { FeedTab } from '@recipeer/core';
import { colors, spacing } from '@recipeer/core';

import { Icon, type IconName, PressableScale, Text } from '@/components/ui';

/**
 * The time-dynamic tab (key `tonight`) takes a meal-based label + icon from the
 * current hour: Breakfast (5–11), Lunch (11–16), Dinner (16–22), Late bites (else).
 */
function currentMeal(date = new Date()): { label: string; icon: IconName } {
  const h = date.getHours();
  if (h >= 5 && h < 11) return { label: 'Breakfast', icon: 'cafe-outline' };
  if (h >= 11 && h < 16) return { label: 'Lunch', icon: 'sunny-outline' };
  if (h >= 16 && h < 22) return { label: 'Dinner', icon: 'moon-outline' };
  return { label: 'Late bites', icon: 'moon-outline' };
}

export interface FeedTabsProps {
  active: FeedTab;
  onChange: (tab: FeedTab) => void;
}

/** The Activity / Trending / <meal> segmented control under the wordmark. */
export function FeedTabs({ active, onChange }: FeedTabsProps) {
  const meal = currentMeal();
  const tabs: { key: FeedTab; label: string; icon?: IconName }[] = [
    { key: 'following', label: 'Activity' },
    { key: 'trending', label: 'Trending' },
    { key: 'tonight', label: meal.label, icon: meal.icon },
  ];

  return (
    <View style={styles.row}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <PressableScale key={tab.key} onPress={() => onChange(tab.key)} style={styles.tab}>
            <View style={styles.labelRow}>
              {tab.icon ? (
                <Icon name={tab.icon} size={14} color={isActive ? 'textPrimary' : 'textSecondary'} />
              ) : null}
              <Text variant="bodyStrong" color={isActive ? 'textPrimary' : 'textSecondary'}>
                {tab.label}
              </Text>
            </View>
            <View style={[styles.underline, isActive && styles.underlineActive]} />
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xl },
  tab: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  underline: { height: 2, width: 20, borderRadius: 2, backgroundColor: 'transparent' },
  underlineActive: { backgroundColor: colors.accent },
});
