import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RecipeViewDTO } from '@recipeer/core';
import { colors, fontFamily, radius, spacing } from '@recipeer/core';

import { Button, Icon, PressableScale, Text } from '@/components/ui';
import { Avatar } from '@/features/home/components/avatar';
import { EndorsementBadge } from '@/features/home/components/endorsement-badge';
import { FlagChip } from '@/features/home/components/flag-chip';
import { countryToFlag, regionLabel } from '@/features/home/utils';

const PREVIEW_INGREDIENTS = 6;

export interface OverviewScreenProps {
  recipe: RecipeViewDTO;
  onStart: () => void;
  onBack: () => void;
  onToggleSave: () => void;
  onToggleFollow: () => void;
  onShare: () => void;
}

/** The recipe viewer — a type-led overview that leads into hands-free cook mode. */
export function OverviewScreen({ recipe, onStart, onBack, onToggleSave, onToggleFollow, onShare }: OverviewScreenProps) {
  const region = regionLabel(recipe.region);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* top chrome */}
      <View style={styles.topBar}>
        <RoundButton icon="chevron-back" label="Go back" onPress={onBack} />
        <View style={styles.topActions}>
          <RoundButton
            icon={recipe.isSaved ? 'bookmark' : 'bookmark-outline'}
            iconColor={recipe.isSaved ? 'primary' : 'textPrimary'}
            label={recipe.isSaved ? 'Remove from saved' : 'Save recipe'}
            onPress={onToggleSave}
          />
          <RoundButton icon="share-outline" label="Share" onPress={onShare} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* region + trust */}
        <View style={styles.trustRow}>
          {recipe.region ? <FlagChip country={recipe.region.country} label={region ?? recipe.region.name} /> : null}
          <EndorsementBadge count={recipe.endorsementCount} region={recipe.region?.name} />
        </View>

        {/* titles */}
        {recipe.titleOriginal ? <Text style={styles.nativeTitle}>{recipe.titleOriginal}</Text> : null}
        <Text variant="display" style={styles.title}>
          {recipe.title}
        </Text>
        {recipe.description ? (
          <Text style={styles.description}>{recipe.description}</Text>
        ) : null}

        {/* contributor */}
        <Contributor recipe={recipe} onToggleFollow={onToggleFollow} />

        {/* quick facts */}
        <QuickFacts recipe={recipe} />

        {/* what you'll do */}
        <SectionLabel>What you’ll do</SectionLabel>
        <StepOutline recipe={recipe} />

        {/* ingredients */}
        <SectionLabel>{`Ingredients · ${recipe.baseServings} servings`}</SectionLabel>
        <IngredientRows recipe={recipe} />

        {/* voice hint */}
        <VoiceHint />
      </ScrollView>

      {/* sticky CTA */}
      <View style={styles.footer}>
        <Button label="Start cooking" leftIcon="flame" onPress={onStart} />
        <Text variant="micro" color="textSecondary" align="center" style={styles.footerHint}>
          Step-by-step · hands-free{recipe.handsOnMinutes ? ` · ~${recipe.handsOnMinutes} min hands-on` : ''}
        </Text>
      </View>
    </SafeAreaView>
  );
}

function RoundButton({
  icon,
  label,
  onPress,
  iconColor = 'textPrimary',
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  onPress: () => void;
  iconColor?: Parameters<typeof Icon>[0]['color'];
}) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={styles.roundBtn}>
      <Icon name={icon} size={20} color={iconColor} />
    </PressableScale>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text variant="heading" style={styles.sectionLabel}>
      {children}
    </Text>
  );
}

function Contributor({ recipe, onToggleFollow }: { recipe: RecipeViewDTO; onToggleFollow: () => void }) {
  const c = recipe.contributor;
  const flag = countryToFlag(c.country);
  return (
    <View style={styles.contributor}>
      <Avatar uri={c.avatarUrl} name={c.displayName} size={44} />
      <View style={styles.contributorMeta}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {c.displayName}
          {flag ? ` ${flag}` : ''}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {[c.region, `${c.recipeCount} recipes shared`].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={c.isFollowing ? `Unfollow ${c.displayName}` : `Follow ${c.displayName}`}
        onPress={onToggleFollow}
        style={[styles.followBtn, c.isFollowing ? styles.followingBtn : styles.notFollowingBtn]}>
        <Text variant="label" color={c.isFollowing ? 'textPrimary' : 'textInverse'}>
          {c.isFollowing ? 'Following' : 'Follow'}
        </Text>
      </PressableScale>
    </View>
  );
}

function QuickFacts({ recipe }: { recipe: RecipeViewDTO }) {
  const facts = [
    { value: recipe.totalTimeMinutes ? `${recipe.totalTimeMinutes} min` : '—', label: 'Total' },
    { value: recipe.handsOnMinutes ? `~${recipe.handsOnMinutes} min` : '—', label: 'Hands-on' },
    { value: String(recipe.baseServings), label: 'Serves' },
    { value: String(recipe.steps.length), label: 'Steps' },
  ];
  return (
    <View style={styles.facts}>
      {facts.map((f, i) => (
        <View key={f.label} style={[styles.fact, i < facts.length - 1 ? styles.factDivider : null]}>
          <Text variant="bodyStrong">{f.value}</Text>
          <Text style={styles.factLabel}>{f.label.toUpperCase()}</Text>
        </View>
      ))}
    </View>
  );
}

function StepOutline({ recipe }: { recipe: RecipeViewDTO }) {
  return (
    <View>
      {recipe.steps.map((s, i) => (
        <View key={s.id} style={[styles.outlineRow, i < recipe.steps.length - 1 ? styles.outlineDivider : null]}>
          <View style={styles.outlineNumber}>
            <Text variant="micro" color="textPrimary">
              {i + 1}
            </Text>
          </View>
          <Text variant="bodyStrong" style={styles.outlineText} numberOfLines={2}>
            {s.summary ?? s.instruction}
          </Text>
          {s.timerSeconds ? (
            <View style={styles.outlineTimer}>
              <Icon name="time-outline" size={13} color="textSecondary" />
              <Text variant="micro" color="textSecondary">
                {Math.round(s.timerSeconds / 60)}m
              </Text>
            </View>
          ) : null}
          {s.caution ? <Icon name="alert-circle" size={16} color="accent" /> : null}
        </View>
      ))}
    </View>
  );
}

function IngredientRows({ recipe }: { recipe: RecipeViewDTO }) {
  const [showAll, setShowAll] = useState(false);
  const rows = showAll ? recipe.ingredients : recipe.ingredients.slice(0, PREVIEW_INGREDIENTS);
  const hasMore = recipe.ingredients.length > PREVIEW_INGREDIENTS;

  return (
    <View>
      <View style={styles.ingredientCard}>
        {rows.map((ing, i) => (
          <View key={ing.id} style={[styles.ingredientRow, i < rows.length - 1 ? styles.ingredientDivider : null]}>
            <Text variant="caption" color="textPrimary" style={styles.ingredientName} numberOfLines={1}>
              {ing.name}
            </Text>
            {ing.qty ? (
              <Text variant="caption" color="textSecondary">
                {ing.qty}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
      {hasMore ? (
        <PressableScale
          accessibilityRole="button"
          onPress={() => setShowAll((v) => !v)}
          style={styles.showAllBtn}>
          <Text variant="label" color="textPrimary">
            {showAll ? 'Show fewer' : `Show all ${recipe.ingredients.length}`}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

function VoiceHint() {
  return (
    <View style={styles.voiceHint}>
      <View style={styles.voiceHintIcon}>
        <Icon name="mic" size={15} color="bleu" />
      </View>
      <Text variant="caption" color="bleuInk" style={styles.voiceHintText}>
        <Text variant="caption" color="bleuInk" style={styles.voiceHintBold}>
          Cook hands-free.{' '}
        </Text>
        Once you start, just say “next”, “how long?”, or “repeat” — no need to touch the screen.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  topActions: { flexDirection: 'row', gap: spacing.sm },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.xs, paddingBottom: spacing.xxl },

  trustRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  nativeTitle: {
    fontFamily: fontFamily.display,
    fontSize: 14,
    fontStyle: 'italic',
    color: colors.burgundyInk,
    marginBottom: spacing.xs,
  },
  title: { fontSize: 34, lineHeight: 40 },
  description: {
    fontFamily: fontFamily.display,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },

  contributor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  contributorMeta: { flex: 1, minWidth: 0, gap: 2 },
  followBtn: { height: 34, paddingHorizontal: spacing.lg, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  notFollowingBtn: { backgroundColor: colors.textPrimary },
  followingBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.borderStrong },

  facts: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingVertical: spacing.md,
  },
  fact: { flex: 1, alignItems: 'center', gap: 3 },
  factDivider: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.border },
  factLabel: { fontFamily: fontFamily.body, fontSize: 9.5, letterSpacing: 0.6, color: colors.textSecondary },

  sectionLabel: { marginTop: spacing.xxl, marginBottom: spacing.md },

  outlineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  outlineDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  outlineNumber: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineText: { flex: 1 },
  outlineTimer: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },

  ingredientCard: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  ingredientDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  ingredientName: { flex: 1 },
  showAllBtn: {
    height: 40,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  voiceHint: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.bleu,
  },
  voiceHintIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceHintText: { flex: 1 },
  voiceHintBold: { fontFamily: fontFamily.bodySemibold },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  footerHint: { marginTop: spacing.sm },
});
