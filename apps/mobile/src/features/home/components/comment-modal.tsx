import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PostCommentDTO } from '@recipeer/core';
import { colors, radius, spacing } from '@recipeer/core';

import { Icon, PressableScale, Text, TextField } from '@/components/ui';
import { useAddComment, useComments } from '../hooks';
import { timeAgo } from '../utils';
import { Avatar } from './avatar';

export interface CommentModalProps {
  postId: string;
  visible: boolean;
  onClose: () => void;
}

/** A bottom-sheet style modal listing a post's comments with an input to add one. */
export function CommentModal({ postId, visible, onClose }: CommentModalProps) {
  const comments = useComments(postId);
  const addComment = useAddComment(postId);
  const [draft, setDraft] = useState('');

  const submit = () => {
    const body = draft.trim();
    if (!body || addComment.isPending) return;
    addComment.mutate(body, { onSuccess: () => setDraft('') });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text variant="heading">Comments</Text>
          <PressableScale accessibilityRole="button" onPress={onClose} hitSlop={8}>
            <Icon name="close" size={24} color="textSecondary" />
          </PressableScale>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {comments.isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.textSecondary} />
            </View>
          ) : (
            <FlatList
              data={comments.data}
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => <CommentRow comment={item} />}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text variant="body" color="textSecondary" style={styles.empty}>
                  No comments yet — be the first.
                </Text>
              }
            />
          )}

          <View style={styles.composer}>
            <View style={styles.flex}>
              <TextField
                placeholder="Add a comment…"
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={submit}
                returnKeyType="send"
              />
            </View>
            <PressableScale
              accessibilityRole="button"
              accessibilityState={{ disabled: !draft.trim() || addComment.isPending }}
              onPress={submit}
              style={[styles.send, !draft.trim() ? styles.sendDisabled : null]}>
              <Icon name="arrow-up" size={20} color="onPrimary" />
            </PressableScale>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function CommentRow({ comment }: { comment: PostCommentDTO }) {
  return (
    <View style={styles.row}>
      <Avatar uri={comment.user.avatarUrl} name={comment.user.displayName} size={32} />
      <View style={styles.rowText}>
        <Text variant="label" numberOfLines={1}>
          {comment.user.displayName}
          <Text variant="micro" color="textSecondary">
            {'  '}· {timeAgo(comment.createdAt)}
          </Text>
        </Text>
        <Text variant="body">{comment.body}</Text>
      </View>
    </View>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.xl, gap: spacing.lg },
  empty: { paddingTop: spacing.xxl, textAlign: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm },
  rowText: { flex: 1, gap: 2 },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  sendDisabled: { opacity: 0.4 },
});
