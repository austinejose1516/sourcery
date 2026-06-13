import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '@recipeer/core';

import { PressableScale, Text } from '@/components/ui';

export type ExploreTab = 'recipes' | 'cooks' | 'collections';

export interface ExploreTabsProps {
  active: ExploreTab;
  onChange: (tab: ExploreTab) => void;
}

const TABS: { key: ExploreTab; label: string }[] = [
  { key: 'recipes', label: 'Recipes' },
  { key: 'cooks', label: 'Cooks' },
  { key: 'collections', label: 'Collections' },
];

/** Recipes / Cooks / Collections segmented control under the Explore header. */
export function ExploreTabs({ active, onChange }: ExploreTabsProps) {
  return (
    <View style={styles.row}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <PressableScale key={tab.key} onPress={() => onChange(tab.key)} style={styles.tab}>
            <Text variant="bodyStrong" color={isActive ? 'textPrimary' : 'textSecondary'}>
              {tab.label}
            </Text>
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
  underline: { height: 2, width: 20, borderRadius: 2, backgroundColor: 'transparent' },
  underlineActive: { backgroundColor: colors.accent },
});
