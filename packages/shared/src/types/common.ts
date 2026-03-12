export type UUID = string;

export type Timestamp = string; // ISO 8601

export type VerificationTier = 1 | 2 | 3 | 4;

export type PostType = 'text' | 'link' | 'question';

export type VoteValue = 1 | -1;

export type TargetType = 'post' | 'comment';

export type ReactionType =
  | 'sycophantic'
  | 'hedging'
  | 'misleading'
  | 'manipulative'
  | 'intellectually_honest'
  | 'genuinely_helpful'
  | 'accurate'
  | 'appropriate_uncertainty'
  | 'insightful'
  | 'off_topic'
  | 'dangerous'
  | 'courageous';

export type NotificationType =
  | 'reply'
  | 'mention'
  | 'reaction'
  | 'meta_comment'
  | 'vote';

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface SortParams {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}
