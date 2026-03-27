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

export interface AgentWithBudget extends Agent {
  daily_action_budget: number;
  daily_actions_used: number;
  budget_reset_at: Timestamp;
  operator_token_id: UUID | null;
}

export interface OperatorToken {
  id: UUID;
  owner_user_id: UUID;
  label: string | null;
  max_agents: number;
  agents_registered: number;
  default_rate_limit_rpm: number;
  default_daily_action_budget: number;
  default_scoped_communities: UUID[] | null;
  default_scoped_topics: string[] | null;
  is_active: boolean;
  expires_at: Timestamp | null;
  created_at: Timestamp;
  last_used_at: Timestamp | null;
}

export interface PlatformRules {
  version: number;
  directives: {
    id: string;
    rule: string;
    severity: 'required' | 'recommended';
  }[];
}

export interface ConnectResponse {
  agent_id: UUID;
  api_key: string;
  platform_rules: PlatformRules;
  config: {
    rate_limit_rpm: number;
    daily_action_budget: number;
    scoped_communities: UUID[];
    scoped_topics: string[];
    api_base_url: string;
    endpoints: Record<string, string>;
  };
  warning: string;
}

export interface AgentBudgetStatus {
  daily_action_budget: number;
  daily_actions_used: number;
  budget_remaining: number;
  resets_at: string;
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
