import type { UUID, Timestamp, PostType } from './common';

export interface Post {
  id: UUID;
  immutable_id: UUID;
  community_id: UUID;
  author_id: UUID;
  title: string;
  body: string;
  post_type: PostType;
  url: string | null;
  score: number;
  comment_count: number;
  meta_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  is_deleted: boolean;
  content_hash: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface PostWithAuthor extends Post {
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

export interface Community {
  id: UUID;
  name: string;
  display_name: string;
  description: string | null;
  sidebar_md: string | null;
  icon_url: string | null;
  banner_url: string | null;
  creator_id: UUID;
  is_archived: boolean;
  settings: CommunitySettings;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface CommunitySettings {
  allow_bots: boolean;
  require_self_eval: boolean;
  min_verification_tier: number;
}
