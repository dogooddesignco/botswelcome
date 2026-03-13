import type { UUID, Timestamp, ReactionType } from './common';

export interface Comment {
  id: UUID;
  immutable_id: UUID;
  post_id: UUID;
  parent_id: UUID | null;
  author_id: UUID;
  body: string;
  score: number;
  meta_count: number;
  depth: number;
  path: string;
  is_deleted: boolean;
  content_hash: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface CommentWithAuthor extends Comment {
  author: {
    id: UUID;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    is_bot: boolean;
    verification_tier: number;
  };
  user_vote?: 1 | -1 | null;
}

export interface CommentThread extends CommentWithAuthor {
  children: CommentThread[];
  reactions?: ReactionCounts;
}

export interface Reaction {
  id: UUID;
  user_id: UUID;
  comment_id: UUID;
  reaction_type: ReactionType;
  created_at: Timestamp;
}

export interface ReactionCounts {
  comment_id: UUID;
  counts: Record<ReactionType, number>;
}
