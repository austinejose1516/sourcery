import { type ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { SharedValue } from 'react-native-reanimated';
import { colors, radius, spacing } from '@recipeer/core';

import { Icon, PressableScale, Text } from '@/components/ui';

type Variant = 'card' | 'row';

function DeleteAction({ onPress, variant }: { onPress: () => void; variant: Variant }) {
  return (
    <PressableScale
      style={[styles.deleteBase, variant === 'card' ? styles.deleteCard : styles.deleteRow]}
      onPress={onPress}
      hitSlop={4}>
      <Icon name="trash-outline" size={18} color="onPrimary" />
      <Text variant="micro" color="onPrimary" style={styles.deleteLabel}>
        Delete
      </Text>
    </PressableScale>
  );
}

/**
 * Swipe-left-to-delete wrapper. `variant="card"` reveals a rounded standalone
 * action (for standalone cards like steps); `variant="row"` reveals a flush,
 * full-height action (for rows inside a shared bordered card, like ingredients).
 */
export function SwipeToDelete({
  children,
  onDelete,
  variant = 'card',
  enabled = true,
  containerStyle,
}: {
  children: ReactNode;
  onDelete: () => void;
  variant?: Variant;
  enabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={36}
      overshootRight={false}
      enabled={enabled}
      containerStyle={containerStyle}
      renderRightActions={(_p: SharedValue<number>, _d: SharedValue<number>, swipeable: SwipeableMethods) => (
        <DeleteAction
          variant={variant}
          onPress={() => {
            swipeable.close();
            onDelete();
          }}
        />
      )}>
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  deleteBase: {
    width: 84,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  // Standalone card: gap + rounded so it reads as its own pill.
  deleteCard: { marginLeft: spacing.sm, borderRadius: radius.card },
  // Table row: flush to the row's right edge, full height (clipped by the card).
  deleteRow: {},
  deleteLabel: { fontWeight: '600' },
});
