import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { RecipeDetailDTO, UpdateRecipeInput } from '@recipeer/core';
import { abbreviateUnits, colors, radius, sizing, spacing, textVariants } from '@recipeer/core';

import { Button, Icon, type IconName, PressableScale, Text } from '@/components/ui';
import { uploadImage } from '@/features/recipes/api';
import { Editable } from '@/features/recipes/editable';
import { usePublishRecipe, useRecipeDetail, useUpdateRecipe } from '@/features/recipes/hooks';
import { makeStep, StepsEditor, type StepEntry } from '@/features/recipes/steps-editor';
import { SwipeToDelete } from '@/features/recipes/swipe-to-delete';

function formatQty(ing: RecipeDetailDTO['ingredients'][number]): string {
  if (ing.quantityNote) return abbreviateUnits(ing.quantityNote);
  if (ing.amount != null) return abbreviateUnits(`${ing.amount}${ing.unit ? ` ${ing.unit}` : ''}`);
  return '';
}

/** File extension from a picked asset, for the R2 key. */
function extOf(uri: string, fileName?: string): string {
  const fromName = fileName?.split('.').pop();
  const fromUri = uri.split('?')[0].split('.').pop();
  return (fromName || fromUri || 'jpg').toLowerCase();
}

// ─── Building blocks ─────────────────────────────────────────────────────────

function SectionHead({
  title,
  count,
  action,
  onAction,
}: {
  title: string;
  count?: number;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionHeadLeft}>
        <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
        {count != null ? (
          <Text style={styles.sectionCount}>· {count}</Text>
        ) : null}
      </View>
      {action && onAction ? (
        <PressableScale style={styles.sectionAction} onPress={onAction}>
          <Icon name="add" size={14} color="primary" />
          <Text variant="caption" color="primary">
            {action}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

function MetaTile({
  icon,
  label,
  children,
}: {
  icon: IconName;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.metaTile}>
      <Icon name={icon} size={18} color="textSecondary" />
      <View style={styles.metaValue}>{children}</View>
      <Text variant="micro" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.stepper}>
      <PressableScale style={styles.stepperBtn} onPress={() => onChange(Math.max(1, value - 1))}>
        <Text variant="bodyStrong" color="textPrimary">
          –
        </Text>
      </PressableScale>
      <Text variant="bodyStrong" color="textPrimary" style={styles.stepperValue}>
        {value}
      </Text>
      <PressableScale style={styles.stepperBtn} onPress={() => onChange(value + 1)}>
        <Text variant="bodyStrong" color="textPrimary">
          +
        </Text>
      </PressableScale>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ReviewScreen() {
  const router = useRouter();
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const { data, isLoading, isError, error, refetch, isFetching } = useRecipeDetail(recipeId);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const update = useUpdateRecipe(recipeId);
  const publish = usePublishRecipe(recipeId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalTime, setTotalTime] = useState('');
  const [servings, setServings] = useState(4);
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [ingredients, setIngredients] = useState<{ name: string; qty: string }[]>([]);
  const [steps, setSteps] = useState<StepEntry[]>([]);
  // Cover: `coverKey` is the R2 key of a freshly-picked image (only this gets PATCHed);
  // `coverPreviewUri` is the local file for instant preview before/while it uploads.
  const [coverKey, setCoverKey] = useState<string | null>(null);
  const [coverPreviewUri, setCoverPreviewUri] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);

  useEffect(() => {
    if (!data) return;
    setTitle(data.title);
    setDescription(data.description ?? '');
    setTotalTime(data.totalTimeMinutes != null ? String(data.totalTimeMinutes) : '');
    setServings(data.baseServings || 4);
    setVisibility(data.isLinkImport ? 'PRIVATE' : data.visibility);
    setIngredients(data.ingredients.map((i) => ({ name: i.name, qty: formatQty(i) })));
    setSteps(
      data.steps.map((s) => ({
        id: s.id,
        text: s.instruction,
        videoStartMs: s.videoStartMs,
        videoEndMs: s.videoEndMs,
      })),
    );
  }, [data]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ReviewHeader />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }
  if (isError || !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ReviewHeader />
        <View style={styles.errorState}>
          <Text variant="heading" align="center">
            Couldn't load this recipe
          </Text>
          <Text variant="body" color="textSecondary" align="center">
            {(error as Error)?.message ?? 'Something went wrong.'}
          </Text>
          <Button
            label="Try again"
            variant="secondary"
            fullWidth={false}
            loading={isFetching}
            onPress={() => refetch()}
          />
        </View>
      </SafeAreaView>
    );
  }

  async function pickCover() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: true,
      aspect: [16, 10],
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setCoverPreviewUri(asset.uri);
    setCoverUploading(true);
    try {
      const { key } = await uploadImage(asset.uri, extOf(asset.uri, asset.fileName ?? undefined));
      setCoverKey(key);
    } catch {
      setCoverPreviewUri(null); // upload failed — drop the preview so it's clearly not saved
    } finally {
      setCoverUploading(false);
    }
  }

  function buildEdits(): UpdateRecipeInput {
    const minutes = parseInt(totalTime, 10);
    return {
      title: title.trim() || 'Untitled recipe',
      description: description.trim() || null,
      baseServings: servings,
      totalTimeMinutes: Number.isFinite(minutes) ? minutes : null,
      // Only send a freshly-uploaded key; never round-trip the signed display URL.
      coverImageUrl: coverKey ?? undefined,
      ingredients: ingredients.map((i) => ({
        name: i.name.trim(),
        quantityNote: i.qty.trim() || null,
      })),
      steps: steps.map((s) => ({
        instruction: s.text.trim(),
        videoStartMs: s.videoStartMs,
        videoEndMs: s.videoEndMs,
      })),
    };
  }

  async function saveAndPublish(vis: 'PUBLIC' | 'PRIVATE') {
    await update.mutateAsync(buildEdits());
    await publish.mutateAsync(vis);
    router.replace('/my-recipes');
  }

  async function saveLinkDoc() {
    await update.mutateAsync(buildEdits());
    router.replace('/my-recipes');
  }

  const busy = update.isPending || publish.isPending;
  const isLink = data.isLinkImport;
  const coverSource = coverPreviewUri ?? data.coverImageUrl;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ReviewHeader />

      <Animated.ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* ---- Cover ---- */}
        <PressableScale style={styles.cover} onPress={pickCover}>
          {coverSource ? (
            <Image source={{ uri: coverSource }} style={styles.coverImage} contentFit="cover" />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Icon name="image-outline" size={26} color="textSecondary" />
              <Text variant="caption" color="textSecondary">
                Add a cover photo
              </Text>
            </View>
          )}
          <View style={styles.coverBtn}>
            <Icon name="image-outline" size={14} color="textPrimary" />
            <Text variant="caption" color="textPrimary">
              {coverSource ? 'Change cover' : 'Pick a cover'}
            </Text>
          </View>
          {coverUploading ? (
            <View style={styles.coverUploading}>
              <ActivityIndicator color={colors.onPrimary} />
            </View>
          ) : null}
        </PressableScale>

        {/* ---- Readiness banner ---- */}
        <View style={styles.banner}>
          <Icon name="sparkles-outline" size={18} color="accent" />
          <View style={styles.bannerBody}>
            <Text variant="bodyStrong" style={styles.bannerTitle}>
              {isLink ? 'Imported — tidy it up' : 'Almost there — give it a check'}
            </Text>
            <Text variant="caption" color="textSecondary">
              {isLink
                ? 'Saved privately to your account. Tap any text to fix it before you save.'
                : 'We wrote this up from your video. Tap any text to fix it before you publish.'}
            </Text>
          </View>
        </View>

        {/* ---- Title ---- */}
        <SectionHead title="Title" />
        <View style={styles.card}>
          <View style={styles.cardPad}>
            <Editable value={title} onChangeText={setTitle} placeholder="Recipe title" textStyle={styles.titleText} />
          </View>
        </View>

        {/* ---- Description ---- */}
        <SectionHead title="Description" />
        <View style={styles.card}>
          <View style={styles.cardPad}>
            <Editable
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="A short description of the dish…"
              textStyle={styles.bodyText}
            />
          </View>
        </View>

        {/* ---- At a glance ---- */}
        <SectionHead title="At a glance" />
        <View style={styles.metaRow}>
          <MetaTile icon="time-outline" label="Total time">
            <View style={styles.timeValue}>
              <Editable
                value={totalTime}
                onChangeText={setTotalTime}
                placeholder="—"
                textStyle={styles.metaText}
              />
              <Text variant="bodyStrong" color="textSecondary">
                min
              </Text>
            </View>
          </MetaTile>
          <MetaTile icon="people-outline" label="Serves">
            <Stepper value={servings} onChange={setServings} />
          </MetaTile>
        </View>

        {/* ---- Ingredients ---- */}
        <SectionHead
          title="Ingredients"
          count={ingredients.length}
          action="Add"
          onAction={() => setIngredients((prev) => [...prev, { name: '', qty: '' }])}
        />
        <Text variant="micro" color="textSecondary" style={styles.stepsHint}>
          Swipe an ingredient left to delete
        </Text>
        <View style={styles.card}>
          {ingredients.map((ing, i) => (
            <SwipeToDelete
              key={i}
              variant="row"
              onDelete={() => setIngredients((prev) => prev.filter((_, idx) => idx !== i))}>
              <View
                style={[styles.ingredientRow, i < ingredients.length - 1 && styles.rowDivider]}>
                <View style={styles.ingredientName}>
                  <Editable
                    value={ing.name}
                    placeholder="Ingredient"
                    onChangeText={(v) =>
                      setIngredients((prev) => prev.map((p, idx) => (idx === i ? { ...p, name: v } : p)))
                    }
                    textStyle={styles.bodyText}
                  />
                </View>
                <View style={styles.ingredientQty}>
                  <Editable
                    value={ing.qty}
                    placeholder="add"
                    onChangeText={(v) =>
                      setIngredients((prev) => prev.map((p, idx) => (idx === i ? { ...p, qty: v } : p)))
                    }
                    textStyle={[styles.qtyText, !ing.qty && styles.qtyEmpty]}
                  />
                </View>
              </View>
            </SwipeToDelete>
          ))}
        </View>

        {/* ---- Steps ---- */}
        <SectionHead
          title="Steps"
          count={steps.length}
          action="Add"
          onAction={() => setSteps((prev) => [...prev, makeStep()])}
        />
        <Text variant="micro" color="textSecondary" style={styles.stepsHint}>
          Hold the grip to reorder · swipe a step left to delete
        </Text>
        <StepsEditor steps={steps} setSteps={setSteps} scrollableRef={scrollRef} />

        {/* ---- Visibility ---- */}
        {!isLink ? (
          <>
            <SectionHead title="Who can see it" />
            <View style={styles.card}>
              {(
                [
                  {
                    key: 'PUBLIC' as const,
                    icon: 'globe-outline' as IconName,
                    t: 'Public',
                    s: 'Anyone on Sourcery can find and cook it.',
                  },
                  {
                    key: 'PRIVATE' as const,
                    icon: 'lock-closed-outline' as IconName,
                    t: 'Private',
                    s: 'Only visible to you in My Recipes.',
                  },
                ]
              ).map((v, i) => {
                const on = visibility === v.key;
                return (
                  <PressableScale
                    key={v.key}
                    style={[styles.visRow, i === 0 && styles.rowDivider]}
                    onPress={() => setVisibility(v.key)}>
                    <Icon name={v.icon} size={18} color={on ? 'primary' : 'textSecondary'} />
                    <View style={styles.visBody}>
                      <Text variant="bodyStrong">{v.t}</Text>
                      <Text variant="caption" color="textSecondary">
                        {v.s}
                      </Text>
                    </View>
                    <View style={[styles.radio, on && styles.radioOn]}>
                      {on ? <Icon name="checkmark" size={12} color="onPrimary" /> : null}
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          </>
        ) : null}
      </Animated.ScrollView>

      {/* ---- Footer ---- */}
      <View style={styles.footer}>
        {isLink ? (
          <Button label="Save to my recipes" leftIcon="lock-closed" loading={busy} onPress={saveLinkDoc} />
        ) : (
          <View style={styles.footerRow}>
            <View style={styles.footerSecondary}>
              <Button
                label="Save"
                variant="secondary"
                leftIcon="bookmark-outline"
                loading={busy}
                onPress={() => saveAndPublish('PRIVATE')}
              />
            </View>
            <View style={styles.footerPrimary}>
              <Button
                label={visibility === 'PUBLIC' ? 'Publish recipe' : 'Save recipe'}
                loading={busy}
                onPress={() => saveAndPublish(visibility)}
              />
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function ReviewHeader() {
  const router = useRouter();
  return (
    <View style={styles.header}>
      <PressableScale style={styles.headerBtn} onPress={() => router.back()}>
        <Icon name="chevron-back" size={20} color="textPrimary" />
      </PressableScale>
      <View style={styles.headerTitle}>
        <Text variant="heading">Review & publish</Text>
        <Text variant="micro" color="textSecondary">
          Step 2 of 2 · check it over
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const CARD: ViewStyle = {
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.card,
  overflow: 'hidden',
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  headerBtn: {
    width: sizing.iconButton,
    height: sizing.iconButton,
    borderRadius: sizing.iconButton / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: { flex: 1 },

  // Scroll body
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl + spacing.xl,
    width: '100%',
    maxWidth: sizing.maxContentWidth,
    alignSelf: 'center',
  },

  // Cover
  cover: {
    aspectRatio: 16 / 10,
    borderRadius: radius.card,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    width: '100%',
  },
  coverPlaceholder: { alignItems: 'center', gap: spacing.xs },
  coverImage: { width: '100%', height: '100%' },
  coverUploading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(61, 40, 23, 0.4)',
  },
  coverBtn: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Readiness banner
  banner: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.apricot,
    marginBottom: spacing.lg,
  },
  bannerBody: { flex: 1, gap: spacing.xxs },
  bannerTitle: { color: colors.apricotInk },

  // Section heads
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  sectionHeadLeft: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  sectionTitle: {
    fontFamily: textVariants.micro.fontFamily,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: colors.textSecondary,
  },
  sectionCount: { fontFamily: textVariants.micro.fontFamily, fontSize: 11, color: colors.textSecondary },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },

  // Cards & rows
  card: CARD,
  cardPad: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },

  // Editable text
  titleText: {
    fontFamily: textVariants.heading.fontFamily,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  bodyText: {
    fontFamily: textVariants.body.fontFamily,
    fontSize: textVariants.body.fontSize,
    // No explicit lineHeight: a tall line box (24 vs 16) makes TextInput render
    // its glyphs at the top of the box, breaking vertical centering in the row.
  },

  // Meta tiles
  metaRow: { flexDirection: 'row', gap: spacing.sm },
  metaTile: {
    flex: 1,
    ...CARD,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  metaValue: { minHeight: 24, justifyContent: 'center' },
  metaText: {
    fontFamily: textVariants.bodyStrong.fontFamily,
    fontSize: textVariants.bodyStrong.fontSize,
    textAlign: 'center',
    minWidth: 22,
  },
  // gap matches the focus pill's horizontal padding so "min" never overlaps it.
  timeValue: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  // Stepper
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepperBtn: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { minWidth: 18, textAlign: 'center' },

  // Ingredient rows — opaque so the swipe-to-delete reveal stays hidden until swiped.
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: sizing.iconButton,
    backgroundColor: colors.surface,
  },
  ingredientName: { flex: 1 },
  // Wide enough for common global measurables with an amount — e.g. "1 1/2 tbsp",
  // "2 glasses", "200 ml", "to taste", "3 cloves", "1 handful".
  ingredientQty: { width: 116, flexShrink: 0 },
  // Persistent chip background so the quantity reads as its own editable field.
  // (bg here overrides the shared Editable's transparent idle state; padding +
  //  radius are inherited from it.)
  qtyText: {
    fontFamily: textVariants.bodyStrong.fontFamily,
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qtyEmpty: { color: colors.primary },

  // Steps
  stepsHint: { paddingHorizontal: spacing.xs, marginBottom: spacing.sm, marginTop: -spacing.xxs },

  // Visibility
  visRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  visBody: { flex: 1, gap: spacing.xxs },
  radio: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { backgroundColor: colors.primary, borderColor: colors.primary },

  // Footer
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  footerRow: { flexDirection: 'row', gap: spacing.sm },
  footerSecondary: { flex: 1 },
  footerPrimary: { flex: 1.5 },
});
