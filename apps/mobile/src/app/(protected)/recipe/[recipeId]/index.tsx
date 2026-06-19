import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RecipeViewDTO } from '@recipeer/core';
import { colors } from '@recipeer/core';

import { BackButton, Text } from '@/components/ui';
import { followCook, unfollowCook } from '@/features/home/api';
import { OverviewScreen } from '@/features/recipe-view/components/overview-screen';
import { recipeViewKeys, useRecipeView, useToggleSaveView } from '@/features/recipe-view/hooks';

export default function RecipeViewerScreen() {
  const router = useRouter();
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const qc = useQueryClient();

  const { data: recipe, isLoading, isError } = useRecipeView(recipeId);
  const toggleSave = useToggleSaveView(recipeId);

  // Follow / unfollow the contributor, optimistically flipping the view cache.
  const key = recipeViewKeys.view(recipeId);
  const toggleFollow = useMutation({
    mutationFn: ({ cookId, isFollowing }: { cookId: string; isFollowing: boolean }) =>
      isFollowing ? unfollowCook(cookId) : followCook(cookId),
    onMutate: async ({ isFollowing }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<RecipeViewDTO>(key);
      qc.setQueryData<RecipeViewDTO>(key, (r) =>
        r
          ? {
              ...r,
              contributor: {
                ...r.contributor,
                isFollowing: !isFollowing,
                followerCount: Math.max(0, r.contributor.followerCount + (isFollowing ? -1 : 1)),
              },
            }
          : r,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (isError || !recipe) {
    return (
      <SafeAreaView style={styles.center}>
        <View style={styles.errorBack}>
          <BackButton />
        </View>
        <Text variant="body" color="textSecondary">
          We couldn’t load this recipe.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <OverviewScreen
      recipe={recipe}
      onBack={() => router.back()}
      onStart={() => router.push({ pathname: '/recipe/[recipeId]/cook', params: { recipeId } })}
      onToggleSave={() => toggleSave.mutate(recipe.isSaved)}
      onToggleFollow={() => toggleFollow.mutate({ cookId: recipe.contributor.id, isFollowing: recipe.contributor.isFollowing })}
      onShare={() => {
        void Share.share({ message: `${recipe.title} — on Sourcery` });
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: colors.background },
  errorBack: { position: 'absolute', top: 8, left: 12 },
});
