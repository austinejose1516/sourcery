import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { RecipeDetailDTO, UpdateRecipeInput } from '@recipeer/core';
import { colors, radius, spacing } from '@recipeer/core';

import { Button, Icon, Screen, Text, TextField } from '@/components/ui';
import { FlowHeader } from '@/features/recipes/flow-header';
import { usePublishRecipe, useRecipeDetail, useUpdateRecipe } from '@/features/recipes/hooks';

function formatQty(ing: RecipeDetailDTO['ingredients'][number]): string {
  if (ing.quantityNote) return ing.quantityNote;
  if (ing.amount != null) return `${ing.amount}${ing.unit ? ` ${ing.unit}` : ''}`;
  return '';
}

export default function ReviewScreen() {
  const router = useRouter();
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const { data, isLoading, isError } = useRecipeDetail(recipeId);
  const update = useUpdateRecipe(recipeId);
  const publish = usePublishRecipe(recipeId);

  const [title, setTitle] = useState('');
  const [ingredients, setIngredients] = useState<{ name: string; qty: string }[]>([]);
  const [steps, setSteps] = useState<string[]>([]);

  useEffect(() => {
    if (!data) return;
    setTitle(data.title);
    setIngredients(data.ingredients.map((i) => ({ name: i.name, qty: formatQty(i) })));
    setSteps(data.steps.map((s) => s.instruction));
  }, [data]);

  if (isLoading) {
    return (
      <Screen keyboardAvoiding={false}>
        <FlowHeader title="Review & publish" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }
  if (isError || !data) {
    return (
      <Screen keyboardAvoiding={false}>
        <FlowHeader title="Review & publish" />
        <View style={styles.center}>
          <Text variant="body" color="textSecondary" align="center">
            Couldn’t load this recipe.
          </Text>
        </View>
      </Screen>
    );
  }

  function buildEdits(): UpdateRecipeInput {
    return {
      title: title.trim() || 'Untitled recipe',
      ingredients: ingredients.map((i) => ({ name: i.name.trim(), quantityNote: i.qty.trim() || null })),
      steps: steps.map((instruction, idx) => ({
        instruction: instruction.trim(),
        videoStartMs: data!.steps[idx]?.videoStartMs ?? null,
        videoEndMs: data!.steps[idx]?.videoEndMs ?? null,
      })),
    };
  }

  async function saveAndPublish(visibility: 'PUBLIC' | 'PRIVATE') {
    await update.mutateAsync(buildEdits());
    await publish.mutateAsync(visibility);
    router.replace('/my-recipes');
  }

  async function saveLinkDoc() {
    await update.mutateAsync(buildEdits());
    router.replace('/my-recipes');
  }

  const busy = update.isPending || publish.isPending;
  const isLink = data.isLinkImport;

  return (
    <Screen scroll>
      <FlowHeader title="Review & publish" />
      <Text variant="body" color="textSecondary" style={styles.intro}>
        {isLink
          ? 'Imported from YouTube — saved privately to your account. Tidy it up if you like.'
          : 'We wrote this up from your video. Tap anything to fix it before you publish.'}
      </Text>

      <TextField label="Title" value={title} onChangeText={setTitle} />

      <Text variant="label" color="textSecondary" style={styles.sectionLabel}>
        Ingredients · {ingredients.length}
      </Text>
      {ingredients.map((ing, i) => (
        <View key={i} style={styles.ingredientRow}>
          <View style={styles.ingredientName}>
            <TextField
              value={ing.name}
              onChangeText={(v) => setIngredients((prev) => prev.map((p, idx) => (idx === i ? { ...p, name: v } : p)))}
            />
          </View>
          <View style={styles.ingredientQty}>
            <TextField
              placeholder="qty"
              value={ing.qty}
              onChangeText={(v) => setIngredients((prev) => prev.map((p, idx) => (idx === i ? { ...p, qty: v } : p)))}
            />
          </View>
        </View>
      ))}

      <Text variant="label" color="textSecondary" style={styles.sectionLabel}>
        Steps · {steps.length}
      </Text>
      {steps.map((instruction, i) => (
        <View key={i} style={styles.stepRow}>
          <View style={styles.stepNum}>
            <Text variant="caption" color="primary">
              {i + 1}
            </Text>
          </View>
          <View style={styles.stepInput}>
            <TextField
              multiline
              value={instruction}
              onChangeText={(v) => setSteps((prev) => prev.map((p, idx) => (idx === i ? v : p)))}
            />
          </View>
        </View>
      ))}

      <View style={styles.actions}>
        {isLink ? (
          <Button label="Save to my recipes" leftIcon="lock-closed" loading={busy} onPress={saveLinkDoc} />
        ) : (
          <>
            <Button label="Publish recipe" loading={busy} onPress={() => saveAndPublish('PUBLIC')} />
            <Button
              label="Save private"
              variant="secondary"
              leftIcon="lock-closed"
              loading={busy}
              onPress={() => saveAndPublish('PRIVATE')}
            />
          </>
        )}
        {!isLink ? (
          <View style={styles.visHint}>
            <Icon name="information-circle-outline" size={16} color="textSecondary" />
            <Text variant="caption" color="textSecondary">
              Public — anyone can find it. Private — only visible to you.
            </Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  intro: { paddingBottom: spacing.lg },
  sectionLabel: { paddingTop: spacing.xl, paddingBottom: spacing.sm },
  ingredientRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  ingredientName: { flex: 2 },
  ingredientQty: { flex: 1 },
  stepRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, alignItems: 'flex-start' },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  stepInput: { flex: 1 },
  actions: { gap: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },
  visHint: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, justifyContent: 'center' },
});
