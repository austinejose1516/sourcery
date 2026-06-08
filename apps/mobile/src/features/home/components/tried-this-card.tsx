import { useState } from 'react';
import { Image } from 'expo-image';
import { Share, StyleSheet, View } from 'react-native';
import type { TriedThisCardDTO } from '@recipeer/core';
import { colors, radius, spacing } from '@recipeer/core';

import { Icon, type IconName, PressableScale, Text } from '@/components/ui';
import { useToggleLike } from '../hooks';
import { countryToFlag, timeAgo } from '../utils';
import { Avatar } from './avatar';
import { CommentModal } from './comment-modal';

export interface TriedThisCardProps {
  post: TriedThisCardDTO;
}

/** A "tried this" social post: who cooked what, their note, photo and actions. */
export function TriedThisCard({ post }: TriedThisCardProps) {
  const flag = countryToFlag(post.user.country);
  const toggleLike = useToggleLike();
  const [commentsOpen, setCommentsOpen] = useState(false);

  const onShare = () => {
    Share.share({
      message: `${post.user.displayName} tried ${post.recipe.title} on Sourcery`,
    }).catch(() => {
      // user dismissed the share sheet — nothing to do
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar uri={post.user.avatarUrl} name={post.user.displayName} size={36} />
        <View style={styles.headerText}>
          <Text variant="label" numberOfLines={1}>
            {post.user.displayName}
            {flag ? `  ${flag}` : ''}
          </Text>
          <Text variant="micro" color="textSecondary">
            tried a recipe · {timeAgo(post.createdAt)}
          </Text>
        </View>
        <Icon name="restaurant-outline" size={16} color="textSecondary" />
      </View>

      {post.note ? <Text variant="body">{post.note}</Text> : null}

      {post.photoUrl ? (
        <Image source={post.photoUrl} style={styles.photo} contentFit="cover" transition={200} />
      ) : null}

      <View style={styles.source}>
        <Icon name="git-branch-outline" size={14} color="textSecondary" />
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          from {post.recipe.title} · {post.recipe.author.displayName}
        </Text>
      </View>

      <View style={styles.actions}>
        <Action
          icon={post.isLiked ? 'heart' : 'heart-outline'}
          color={post.isLiked ? 'danger' : 'textSecondary'}
          label={post.likeCount > 0 ? String(post.likeCount) : 'Like'}
          onPress={() => toggleLike.mutate({ postId: post.id, isLiked: post.isLiked })}
        />
        <Action
          icon="chatbubble-outline"
          label={post.commentCount > 0 ? String(post.commentCount) : 'Comment'}
          onPress={() => setCommentsOpen(true)}
        />
        <Action icon="share-outline" label="Share" onPress={onShare} />
      </View>

      <CommentModal
        postId={post.id}
        visible={commentsOpen}
        onClose={() => setCommentsOpen(false)}
      />
    </View>
  );
}

interface ActionProps {
  icon: IconName;
  label: string;
  color?: 'textSecondary' | 'danger';
  onPress: () => void;
}

function Action({ icon, label, color = 'textSecondary', onPress }: ActionProps) {
  return (
    <PressableScale accessibilityRole="button" onPress={onPress} style={styles.action}>
      <Icon name={icon} size={18} color={color} />
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerText: { flex: 1, gap: 2 },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md },
  source: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
