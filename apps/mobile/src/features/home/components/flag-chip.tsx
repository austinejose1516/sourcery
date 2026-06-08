import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@recipeer/core';

import { Text } from '@/components/ui';
import { countryToFlag } from '../utils';

export interface FlagChipProps {
  /** ISO-3166 alpha-2 country code, e.g. "IN". */
  country: string | null;
  /** Region/place label, e.g. "Kerala, India". */
  label: string;
}

/** Small flag + place pill overlaid on recipe covers (e.g. "🇮🇳 Kerala, India"). */
export function FlagChip({ country, label }: FlagChipProps) {
  const flag = countryToFlag(country);
  return (
    <View style={styles.chip}>
      {flag ? <Text variant="label">{flag}</Text> : null}
      <Text variant="micro" color="textPrimary" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    // Hug the content instead of stretching to the absolute parent's width
    // (otherwise the row left-aligns and leaves a gap on the right).
    alignSelf: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    // Horizontal padding clears the fully-rounded caps so the flag/text aren't
    // jammed against the curve; a touch more vertical padding balances the pill.
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    // maxWidth: '90%',
    // Subtle lift so the pill stays legible over busy cover photos.
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
