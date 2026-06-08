import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RecipeCardDTO } from '@recipeer/core';
import { colors, radius, spacing } from '@recipeer/core';

import { Button, Icon, PressableScale, Text, TextField } from '@/components/ui';
import { useCreatePost, useMostLoved } from '../hooks';

export interface NewPostModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Compose a new "tried this" post: pick a recipe you cooked and add a note.
 * (Photo upload comes later — posts go out text-only for now.)
 */
export function NewPostModal({ visible, onClose }: NewPostModalProps) {
  const recipes = useMostLoved();
  const createPost = useCreatePost();
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const reset = () => {
    setRecipeId(null);
    setNote('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = () => {
    if (!recipeId || createPost.isPending) return;
    createPost.mutate(
      { recipeId, note: note.trim() || null },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text variant="heading">New post</Text>
          <PressableScale accessibilityRole="button" onPress={close} hitSlop={8}>
            <Icon name="close" size={24} color="textSecondary" />
          </PressableScale>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Text variant="label" color="textSecondary">
              Which recipe did you cook?
            </Text>

            {recipes.isLoading ? (
              <ActivityIndicator color={colors.textSecondary} />
            ) : (
              <View style={styles.picker}>
                {recipes.data?.map((r) => (
                  <RecipeOption
                    key={r.id}
                    recipe={r}
                    selected={recipeId === r.id}
                    onPress={() => setRecipeId(r.id)}
                  />
                ))}
              </View>
            )}

            <TextField
              label="Note"
              placeholder="How did it go? (optional)"
              value={note}
              onChangeText={setNote}
              multiline
            />
          </ScrollView>

          <View style={styles.footer}>
            <Button
              label="Share post"
              onPress={submit}
              disabled={!recipeId}
              loading={createPost.isPending}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function RecipeOption({
  recipe,
  selected,
  onPress,
}: {
  recipe: RecipeCardDTO;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.option, selected ? styles.optionSelected : null]}>
      {recipe.coverImageUrl ? (
        <Image source={recipe.coverImageUrl} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]} />
      )}
      <View style={styles.optionText}>
        <Text variant="label" numberOfLines={1}>
          {recipe.title}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {recipe.author.displayName}
        </Text>
      </View>
      {selected ? <Icon name="checkmark-circle" size={22} color="primary" /> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  content: { padding: spacing.xl, gap: spacing.md },
  picker: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: { borderColor: colors.primary },
  thumb: { width: 52, height: 52, borderRadius: radius.sm },
  thumbFallback: { backgroundColor: colors.surfaceMuted },
  optionText: { flex: 1, gap: 2 },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
