import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ExploreRecipeQuery } from '@recipeer/core';
import { colors, sizing, spacing } from '@recipeer/core';

import { Logo } from '@/components/ui';
import {
  CollectionsTab,
  CooksTab,
  ExploreTabs,
  RecipesTab,
  SearchBar,
  SearchOverlay,
  type ExploreTab,
} from '../components';

const SEARCH_PLACEHOLDER: Record<ExploreTab, string> = {
  recipes: 'Search recipes or cooks…',
  cooks: 'Search cooks by name or region…',
  collections: 'Search collections…',
};

export function ExploreScreen() {
  const [tab, setTab] = useState<ExploreTab>('recipes');
  const [filters, setFilters] = useState<ExploreRecipeQuery>({});
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Logo size="lg" />
        <SearchBar placeholder={SEARCH_PLACEHOLDER[tab]} onPress={() => setSearchOpen(true)} />
        <ExploreTabs active={tab} onChange={setTab} />
      </View>

      {tab === 'recipes' ? (
        <RecipesTab filters={filters} onFiltersChange={setFilters} />
      ) : tab === 'cooks' ? (
        <CooksTab />
      ) : (
        <CollectionsTab />
      )}

      <SearchOverlay visible={searchOpen} onClose={() => setSearchOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    width: '100%',
    maxWidth: sizing.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.lg,
  },
});
