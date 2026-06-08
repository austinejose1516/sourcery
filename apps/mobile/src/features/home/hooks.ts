import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreatePostInput,
  FeedItem,
  FeedTab,
  RecipeCardDTO,
  SuggestedCookDTO,
} from '@recipeer/core';
import {
  createComment,
  createPost,
  fetchComments,
  fetchFeed,
  fetchMostLoved,
  fetchSuggestions,
  followCook,
  likePost,
  saveRecipe,
  unfollowCook,
  unlikePost,
  unsaveRecipe,
} from './api';

// Query keys — kept in one place so mutations can target caches precisely.
export const feedKeys = {
  feed: (tab: FeedTab) => ['feed', tab] as const,
  suggestions: ['suggestions'] as const,
  mostLoved: ['most-loved'] as const,
  comments: (postId: string) => ['comments', postId] as const,
};

export const useFeed = (tab: FeedTab) =>
  useQuery({ queryKey: feedKeys.feed(tab), queryFn: () => fetchFeed(tab) });

export const useSuggestions = () =>
  useQuery({ queryKey: feedKeys.suggestions, queryFn: fetchSuggestions });

export const useMostLoved = () =>
  useQuery({ queryKey: feedKeys.mostLoved, queryFn: fetchMostLoved });

/**
 * Save / unsave a recipe with an optimistic flip of `isSaved` + `saveCount`
 * across every cached feed list, rolling back if the request fails.
 */
export const useToggleSave = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ recipeId, isSaved }: { recipeId: string; isSaved: boolean }) =>
      isSaved ? unsaveRecipe(recipeId) : saveRecipe(recipeId),

    onMutate: async ({ recipeId, isSaved }) => {
      await qc.cancelQueries({ queryKey: ['feed'] });
      await qc.cancelQueries({ queryKey: feedKeys.mostLoved });
      const delta = isSaved ? -1 : 1;

      const patchRecipe = (r: RecipeCardDTO): RecipeCardDTO =>
        r.id === recipeId
          ? { ...r, isSaved: !isSaved, saveCount: Math.max(0, r.saveCount + delta) }
          : r;

      const prevFeeds = qc.getQueriesData<FeedItem[]>({ queryKey: ['feed'] });
      qc.setQueriesData<FeedItem[]>({ queryKey: ['feed'] }, (items) =>
        items?.map((it) => (it.kind === 'recipe' ? { kind: 'recipe', ...patchRecipe(it) } : it)),
      );

      const prevLoved = qc.getQueryData<RecipeCardDTO[]>(feedKeys.mostLoved);
      qc.setQueryData<RecipeCardDTO[]>(feedKeys.mostLoved, (rs) => rs?.map(patchRecipe));

      return { prevFeeds, prevLoved };
    },

    onError: (_err, _vars, ctx) => {
      ctx?.prevFeeds?.forEach(([key, data]) => qc.setQueryData(key, data));
      if (ctx?.prevLoved) qc.setQueryData(feedKeys.mostLoved, ctx.prevLoved);
    },
  });
};

/**
 * Follow / unfollow a cook. Optimistically flips `isFollowing` on the
 * suggestions list and refreshes the Following feed so the cook's recipes appear.
 */
export const useToggleFollow = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ cookId, isFollowing }: { cookId: string; isFollowing: boolean }) =>
      isFollowing ? unfollowCook(cookId) : followCook(cookId),

    onMutate: async ({ cookId, isFollowing }) => {
      await qc.cancelQueries({ queryKey: feedKeys.suggestions });
      const prev = qc.getQueryData<SuggestedCookDTO[]>(feedKeys.suggestions);
      qc.setQueryData<SuggestedCookDTO[]>(feedKeys.suggestions, (cooks) =>
        cooks?.map((c) => (c.id === cookId ? { ...c, isFollowing: !isFollowing } : c)),
      );
      return { prev };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(feedKeys.suggestions, ctx.prev);
    },
  });
};

/**
 * Like / unlike a "tried this" post with an optimistic flip of `isLiked` +
 * `likeCount` across every cached feed list, rolling back if the request fails.
 */
export const useToggleLike = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, isLiked }: { postId: string; isLiked: boolean }) =>
      isLiked ? unlikePost(postId) : likePost(postId),

    onMutate: async ({ postId, isLiked }) => {
      await qc.cancelQueries({ queryKey: ['feed'] });
      const delta = isLiked ? -1 : 1;

      const prevFeeds = qc.getQueriesData<FeedItem[]>({ queryKey: ['feed'] });
      qc.setQueriesData<FeedItem[]>({ queryKey: ['feed'] }, (items) =>
        items?.map((it) =>
          it.kind === 'tried' && it.id === postId
            ? { ...it, isLiked: !isLiked, likeCount: Math.max(0, it.likeCount + delta) }
            : it,
        ),
      );

      return { prevFeeds };
    },

    onError: (_err, _vars, ctx) => {
      ctx?.prevFeeds?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
  });
};

/** The comment thread for a post. */
export const useComments = (postId: string) =>
  useQuery({ queryKey: feedKeys.comments(postId), queryFn: () => fetchComments(postId) });

/**
 * Add a comment, then refresh the thread and bump `commentCount` on the post
 * wherever it appears in a cached feed.
 */
export const useAddComment = (postId: string) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: string) => createComment(postId, body),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.comments(postId) });
      qc.setQueriesData<FeedItem[]>({ queryKey: ['feed'] }, (items) =>
        items?.map((it) =>
          it.kind === 'tried' && it.id === postId
            ? { ...it, commentCount: it.commentCount + 1 }
            : it,
        ),
      );
    },
  });
};

/** Compose a new "tried this" post, then refresh the Activity feed. */
export const useCreatePost = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePostInput) => createPost(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.feed('following') });
    },
  });
};
