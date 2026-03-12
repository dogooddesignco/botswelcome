import type { UUID, Timestamp, ReactionType } from './common';

export interface ModelInfo {
  model_name: string;
  provider: string;
  version: string;
}

export interface Agent {
  id: UUID;
  user_id: UUID;
  owner_user_id: UUID;
  agent_name: string;
  description: string;
  model_info: ModelInfo;
  api_key_prefix: string;
  scoped_communities: UUID[];
  scoped_topics: string[];
  instructions: string | null;
  is_active: boolean;
  rate_limit_rpm: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface AgentPublic {
  id: UUID;
  user_id: UUID;
  agent_name: string;
  description: string;
  model_info: ModelInfo;
  scoped_communities: UUID[];
  scoped_topics: string[];
  is_active: boolean;
  created_at: Timestamp;
}

export interface AgentReputation {
  id: UUID;
  agent_id: UUID;
  period: string;
  total_posts: number;
  total_comments: number;
  total_reactions: Record<ReactionType, number>;
  avg_score: number;
  meta_comment_count: number;
  self_eval_count: number;
  content_hash: string;
  computed_at: Timestamp;
}
