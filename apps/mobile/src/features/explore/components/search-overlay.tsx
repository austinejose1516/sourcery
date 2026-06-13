import { useState } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import type { CollectionCardDTO, ExploreCookDTO, RecipeCardDTO } from '@recipeer/core';
import { colors, radius, sizing, spacing } from '@recipeer/core';

import { Icon, PressableScale, Text, TextField } from '@/components/ui';
import { useExploreSearch, useExploreToggleFollow, useExploreToggleSave } from '../hooks';
import { CollectionCard } from './collection-card';
import { ExploreCookCard } from './explore-cook-card';
import { RecipeGridCard } from './recipe-grid-card';

export interface SearchOverlayProps {
  visible: boolean;
  onClose: () => void;
}

/** Splits a list into pairs so grid results can render as rows of two. */
function pairs<T>(items: T[]): [T, T?][] {
  const out: [T, T?][] = [];
  for (let i = 0; i < items.length; i += 2) out.push([items[i], items[i + 1]]);
  return out;
}

/**
 * Full-screen search experience that floats over the dimmed + blurred page.
 * Searches recipes, cooks and collections at once.
 */
export function SearchOverlay({ visible, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const search = useExploreSearch(query);
  const toggleSave = useExploreToggleSave();
  const toggleFollow = useExploreToggleFollow();

  const results = search.data;
  const hasQuery = query.trim().length >= 2;
  const isEmpty =
    hasQuery &&
    !search.isFetching &&
    results != null &&
    results.recipes.length === 0 &&
    results.cooks.length === 0 &&
    results.collections.length === 0;

  const close = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      {/* A RN Modal renders in its own native view tree, so re-provide safe-area
          insets here — otherwise SafeAreaView resolves a 0 top inset and the
          search row slides under the dynamic island. */}
      <SafeAreaProvider>
        {/* Backdrop closer: taps on empty areas bubble up to this ancestor and
            dismiss, while the field, close button and result cards capture
            their own taps so they don't trigger it. */}
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close search">
          <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill}>
            <View style={styles.scrim} />
            <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <View style={styles.content}>
              <View style={styles.searchRow}>
                <View style={styles.fieldWrap}>
                  <TextField
                    autoFocus
                    placeholder="Search recipes, cooks, collections…"
                    value={query}
                    onChangeText={setQuery}
                    returnKeyType="search"
                    autoCorrect={false}
                  />
                </View>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="Close search"
                  onPress={close}
                  hitSlop={8}
                  style={styles.cancel}>
                  <Icon name="close" size={22} color="textPrimary" />
                </PressableScale>
              </View>

            {!hasQuery ? (
              <View style={styles.hint}>
                <Text variant="body" color="textSecondary" align="center">
                  Search across every recipe, cook and collection.
                </Text>
              </View>
            ) : isEmpty ? (
              <View style={styles.hint}>
                <Text variant="body" color="textSecondary" align="center">
                  Nothing found for “{query.trim()}”.
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.results}
                contentContainerStyle={styles.resultsContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                <RecipeResults
                  recipes={results?.recipes ?? []}
                  onToggleSave={(r) => toggleSave.mutate({ recipeId: r.id, isSaved: r.isSaved })}
                />
                <CookResults
                  cooks={results?.cooks ?? []}
                  pending={toggleFollow.isPending}
                  onToggleFollow={(c) => toggleFollow.mutate({ cookId: c.id, isFollowing: c.isFollowing })}
                />
                <CollectionResults collections={results?.collections ?? []} />
              </ScrollView>
            )}
            </View>
          </SafeAreaView>
          </BlurView>
        </Pressable>
      </SafeAreaProvider>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="label" color="textSecondary">
        {title}
      </Text>
      {children}
    </View>
  );
}

function RecipeResults({
  recipes,
  onToggleSave,
}: {
  recipes: RecipeCardDTO[];
  onToggleSave: (r: RecipeCardDTO) => void;
}) {
  if (recipes.length === 0) return null;
  return (
    <Section title="Recipes">
      {pairs(recipes).map((row, i) => (
        <View key={i} style={styles.gridRow}>
          {row.map((r) =>
            r ? <RecipeGridCard key={r.id} recipe={r} onToggleSave={() => onToggleSave(r)} /> : null,
          )}
          {row.length === 1 ? <View style={styles.gridSpacer} /> : null}
        </View>
      ))}
    </Section>
  );
}

function CookResults({
  cooks,
  pending,
  onToggleFollow,
}: {
  cooks: ExploreCookDTO[];
  pending: boolean;
  onToggleFollow: (c: ExploreCookDTO) => void;
}) {
  if (cooks.length === 0) return null;
  return (
    <Section title="Cooks">
      {cooks.map((c) => (
        <ExploreCookCard key={c.id} cook={c} pending={pending} onToggleFollow={() => onToggleFollow(c)} />
      ))}
    </Section>
  );
}

function CollectionResults({ collections }: { collections: CollectionCardDTO[] }) {
  if (collections.length === 0) return null;
  return (
    <Section title="Collections">
      {collections.map((c) => (
        <CollectionCard key={c.id} collection={c} />
      ))}
    </Section>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(251, 246, 236, 0.55)' },
  safe: { flex: 1 },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: sizing.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fieldWrap: { flex: 1 },
  cancel: {
    width: sizing.iconButton,
    height: sizing.iconButton,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  results: { flex: 1 },
  resultsContent: { gap: spacing.xl, paddingBottom: spacing.xxxl },
  section: { gap: spacing.md },
  gridRow: { flexDirection: 'row', gap: spacing.lg },
  gridSpacer: { flex: 1, minWidth: 0 },
});
