import { ScrollView, StyleSheet } from 'react-native';
import type { ExploreDifficulty, ExploreRecipeQuery } from '@recipeer/core';
import { colors, radius, spacing } from '@recipeer/core';

import { PressableScale, Text } from '@/components/ui';
import { useExploreFilters } from '../hooks';

export interface FilterChipsProps {
  filters: ExploreRecipeQuery;
  onChange: (next: ExploreRecipeQuery) => void;
}

const DIFFICULTIES: { value: ExploreDifficulty; label: string }[] = [
  { value: 'EASY', label: 'Easy' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HARD', label: 'Hard' },
];

/** A single toggleable filter pill. */
function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}>
      <Text variant="label" color={active ? 'onPrimary' : 'textPrimary'}>
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * Horizontal row of recipe filter chips. Each dimension (time / difficulty /
 * diet) is single-select and toggles off when its active chip is tapped again.
 */
export function FilterChips({ filters, onChange }: FilterChipsProps) {
  const { data } = useExploreFilters();

  const toggle = <K extends keyof ExploreRecipeQuery>(key: K, value: ExploreRecipeQuery[K]) =>
    onChange({ ...filters, [key]: filters[key] === value ? undefined : value });

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}>
      <Chip
        label="Under 30 min"
        active={filters.maxMinutes === 30}
        onPress={() => toggle('maxMinutes', 30)}
      />
      {DIFFICULTIES.map((d) => (
        <Chip
          key={d.value}
          label={d.label}
          active={filters.difficulty === d.value}
          onPress={() => toggle('difficulty', d.value)}
        />
      ))}
      {data?.dietary.map((tag) => (
        <Chip
          key={tag.slug}
          label={tag.name}
          active={filters.diet === tag.slug}
          onPress={() => toggle('diet', tag.slug)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Keep the horizontal rail from stretching to fill the parent's height.
  scroll: { flexGrow: 0 },
  content: { gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.xs },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipIdle: { backgroundColor: colors.surface, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
});
