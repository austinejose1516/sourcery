/**
 * Feed DTOs — the wire contract between the API (apps/api) and the mobile app
 * (apps/mobile). Both sides import these so the shapes can never drift.
 *
 * These are deliberately flatter than the Prisma models: they carry exactly what
 * the Home-feed and Cold-start screens render, with viewer-relative flags
 * (`isSaved`, `isFollowing`) resolved server-side.
 */

/** A cook as shown in an author row or a suggestion. */
export interface FeedAuthorDTO {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  /** ISO-3166 alpha-2, e.g. "IN" — the client turns this into a flag emoji. */
  country: string | null;
}

export interface FeedCuisineDTO {
  name: string;
  slug: string;
}

export interface FeedRegionDTO {
  name: string;
  /** ISO-3166 alpha-2 of the region's country. */
  country: string;
}

/** A recipe card in the timeline / most-loved rail. */
export interface RecipeCardDTO {
  id: string;
  title: string;
  titleOriginal: string | null;
  description: string | null;
  cuisine: FeedCuisineDTO | null;
  region: FeedRegionDTO | null;
  author: FeedAuthorDTO;
  coverImageUrl: string | null;
  endorsementCount: number;
  saveCount: number;
  /** True if the current viewer has saved this recipe. */
  isSaved: boolean;
}

/** A "tried this" social post in the timeline. */
export interface TriedThisCardDTO {
  id: string;
  user: FeedAuthorDTO;
  note: string | null;
  photoUrl: string | null;
  /** ISO timestamp; the client renders it as a relative "· 2h". */
  createdAt: string;
  recipe: {
    id: string;
    title: string;
    author: Pick<FeedAuthorDTO, 'displayName'>;
  };
  likeCount: number;
  commentCount: number;
  /** True if the current viewer has liked this post. */
  isLiked: boolean;
}

/** A comment on a "tried this" post, as shown in the comment thread. */
export interface PostCommentDTO {
  id: string;
  user: FeedAuthorDTO;
  body: string;
  /** ISO timestamp; the client renders it as a relative "· 2h". */
  createdAt: string;
}

/** Payload for composing a new "tried this" post. */
export interface CreatePostInput {
  recipeId: string;
  note?: string | null;
}

/** Discriminated union for the mixed Following timeline. */
export type FeedItem =
  | ({ kind: 'recipe' } & RecipeCardDTO)
  | ({ kind: 'tried' } & TriedThisCardDTO);

/** A cook surfaced on the Cold-start screen. */
export interface SuggestedCookDTO {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  region: FeedRegionDTO | null;
  recipeCount: number;
  /** True if the current viewer already follows this cook. */
  isFollowing: boolean;
}

/** The three top-of-feed segments. */
export type FeedTab = 'tonight' | 'following' | 'trending';
