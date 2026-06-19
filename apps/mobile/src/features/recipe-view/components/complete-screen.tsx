import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RecipeViewDTO } from '@recipeer/core';
import { colors, radius, spacing } from '@recipeer/core';

import { Button, Icon, PressableScale, Text } from '@/components/ui';

export interface CompleteScreenProps {
  recipe: RecipeViewDTO;
  /** Records a TriedThis; resolves once saved. */
  onMarkTried: () => Promise<unknown>;
  /** Leave the cook flow (declined, or done). */
  onClose: () => void;
}

/** Celebration + the "did you cook this?" prompt that buckets it into Tried. */
export function CompleteScreen({ recipe, onMarkTried, onClose }: CompleteScreenProps) {
  const [phase, setPhase] = useState<'ask' | 'saving' | 'done'>(
    recipe.triedByMe ? 'done' : 'ask',
  );

  const onYes = async () => {
    setPhase('saving');
    try {
      await onMarkTried();
      setPhase('done');
    } catch {
      setPhase('ask');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <PressableScale accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.closeBtn}>
          <Icon name="close" size={16} color="textPrimary" />
        </PressableScale>
      </View>

      <View style={styles.celebration}>
        <View style={styles.checkOrb}>
          <Icon name="checkmark" size={44} color="textInverse" />
        </View>
        <Text variant="title" align="center" style={styles.heading}>
          You did it.
        </Text>
        <Text variant="caption" color="textSecondary" align="center" style={styles.sub}>
          {recipe.title}, all {recipe.steps.length} steps.
        </Text>
      </View>

      <View style={styles.body}>
        {phase === 'done' ? (
          <View style={styles.doneCard}>
            <View style={styles.triedBadge}>
              <Icon name="bookmark" size={16} color="herb" />
            </View>
            <View style={styles.doneMeta}>
              <Text variant="bodyStrong">Added to your tried recipes</Text>
              <Text variant="caption" color="textSecondary">
                Find it under My Recipes → Tried.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.askCard}>
            <Text variant="bodyStrong" align="center">
              Did you cook this recipe?
            </Text>
            <Text variant="caption" color="textSecondary" align="center" style={styles.askSub}>
              We’ll add it to your tried recipes.
            </Text>
            {phase === 'saving' ? (
              <ActivityIndicator color={colors.primary} style={styles.saving} />
            ) : (
              <View style={styles.askActions}>
                <View style={styles.askAction}>
                  <Button label="Not yet" variant="secondary" onPress={onClose} />
                </View>
                <View style={styles.askAction}>
                  <Button label="Yes, I did" leftIcon="checkmark" onPress={onYes} />
                </View>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Button label="Back to recipe" variant="ghost" onPress={onClose} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebration: { alignItems: 'center', paddingHorizontal: spacing.xxl, marginTop: spacing.xl },
  checkOrb: { width: 96, height: 96, borderRadius: radius.pill, backgroundColor: colors.herb, alignItems: 'center', justifyContent: 'center' },
  heading: { marginTop: spacing.lg },
  sub: { marginTop: spacing.sm, maxWidth: 260 },

  body: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  askCard: {
    padding: spacing.xl,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  askSub: { marginTop: spacing.xs },
  saving: { marginTop: spacing.lg },
  askActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  askAction: { flex: 1 },

  doneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  triedBadge: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  doneMeta: { flex: 1, gap: 2 },

  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
});
