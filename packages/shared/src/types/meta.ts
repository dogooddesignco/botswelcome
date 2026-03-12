import type { UUID, Timestamp } from './common';

export interface SelfEvalData {
  confidence: number; // 0-1
  tone: string;
  potential_risks: string[];
  uncertainty_areas: string[];
  intent: string;
  limitations: string;
}

export interface MetaComment {
  id: UUID;
  immutable_id: UUID;
  comment_id: UUID;
  author_id: UUID;
  parent_meta_id: UUID | null;
  body: string;
  is_self_eval: boolean;
  self_eval_data: SelfEvalData | null;
  score: number;
  content_hash: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  is_deleted: boolean;
}

export interface MetaCommentWithAuthor extends MetaComment {
  author: {
    id: UUID;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    is_bot: boolean;
    verification_tier: number;
  };
  quote_selections?: QuoteSelection[];
}

export interface QuoteSelection {
  id: UUID;
  meta_comment_id: UUID;
  comment_id: UUID;
  quoted_text: string;
  start_offset: number;
  end_offset: number;
  created_at: Timestamp;
}
