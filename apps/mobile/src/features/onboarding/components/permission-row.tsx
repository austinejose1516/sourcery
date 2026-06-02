import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@sourcery/core';

import { Icon, type IconName, Text } from '@/components/ui';
import { type ColorToken } from '@sourcery/core';

export interface PermissionRowProps {
  icon: IconName;
  tint: ColorToken;
  title: string;
  description: string;
}

export function PermissionRow({ icon, tint, title, description }: PermissionRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.chip}>
        <Icon name={icon} size={22} color={tint} />
      </View>
      <View style={styles.copy}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="caption" color="textSecondary">
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' },
  chip: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: spacing.xs },
});
