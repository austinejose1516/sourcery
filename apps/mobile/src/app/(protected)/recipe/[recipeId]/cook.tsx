import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';

import { CookFlow } from '@/features/recipe-view/components/cook-flow';
import { cookColors } from '@/features/recipe-view/cook-theme';
import { useRecipeView } from '@/features/recipe-view/hooks';

export default function CookModeScreen() {
  const router = useRouter();
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const { data: recipe, isLoading } = useRecipeView(recipeId);

  return (
    <>
      <Stack.Screen options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }} />
      {recipe ? (
        <CookFlow recipe={recipe} onExit={() => router.back()} />
      ) : (
        <View style={styles.center}>
          <StatusBar barStyle="light-content" />
          {isLoading ? <ActivityIndicator color={cookColors.accent} /> : null}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cookColors.bg },
});
