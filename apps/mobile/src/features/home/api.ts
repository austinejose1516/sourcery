import type {
  CreatePostInput,
  FeedItem,
  FeedTab,
  PostCommentDTO,
  RecipeCardDTO,
  SuggestedCookDTO,
  TriedThisCardDTO,
} from '@recipeer/core';
import { apiDelete, apiGet, apiPost } from '@/lib/api-client';

/** Maps a feed tab to its endpoint path. */
const TAB_PATH: Record<FeedTab, string> = {
  tonight: '/feed/tonight',
  following: '/feed/following',
  trending: '/feed/trending',
};

export const fetchFeed = (tab: FeedTab) =>
  apiGet<{ items: FeedItem[] }>(TAB_PATH[tab]).then((r) => r.items);

export const fetchSuggestions = () =>
  apiGet<{ cooks: SuggestedCookDTO[] }>('/feed/suggestions').then((r) => r.cooks);

export const fetchMostLoved = () =>
  apiGet<{ recipes: RecipeCardDTO[] }>('/feed/most-loved').then((r) => r.recipes);

export const followCook = (followingId: string) =>
  apiPost<{ following: boolean }>('/social/follow', { followingId });

export const unfollowCook = (followingId: string) =>
  apiDelete<{ following: boolean }>('/social/follow', { followingId });

export const saveRecipe = (recipeId: string) =>
  apiPost<{ saved: boolean; saveCount: number }>('/social/save', { recipeId });

export const unsaveRecipe = (recipeId: string) =>
  apiDelete<{ saved: boolean; saveCount: number }>('/social/save', { recipeId });

export const likePost = (postId: string) =>
  apiPost<{ liked: boolean; likeCount: number }>('/social/like', { postId });

export const unlikePost = (postId: string) =>
  apiDelete<{ liked: boolean; likeCount: number }>('/social/like', { postId });

export const fetchComments = (postId: string) =>
  apiGet<{ comments: PostCommentDTO[] }>(`/social/comments?postId=${postId}`).then((r) => r.comments);

export const createComment = (postId: string, body: string) =>
  apiPost<{ comment: PostCommentDTO; commentCount: number }>('/social/comments', { postId, body });

export const createPost = (input: CreatePostInput) =>
  apiPost<{ post: TriedThisCardDTO }>('/social/posts', input).then((r) => r.post);
