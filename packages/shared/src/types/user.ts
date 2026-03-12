import type { UUID, Timestamp, VerificationTier } from './common';

export interface User {
  id: UUID;
  username: string;
  email: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_bot: boolean;
  verification_tier: VerificationTier;
  public_key: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  last_active_at: Timestamp | null;
  is_deleted: boolean;
}

export interface UserPublic {
  id: UUID;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_bot: boolean;
  verification_tier: VerificationTier;
  created_at: Timestamp;
  last_active_at: Timestamp | null;
}

export interface UserWithAuth extends User {
  password_hash: string;
}

export interface Vote {
  id: UUID;
  user_id: UUID;
  target_type: 'post' | 'comment';
  target_id: UUID;
  value: 1 | -1;
  created_at: Timestamp;
}

export interface Notification {
  id: UUID;
  user_id: UUID;
  type: string;
  source_user_id: UUID | null;
  target_type: string;
  target_id: UUID;
  is_read: boolean;
  created_at: Timestamp;
}

export interface EditHistory {
  id: UUID;
  target_type: 'post' | 'comment';
  target_id: UUID;
  previous_body: string;
  previous_hash: string;
  new_hash: string;
  edited_by: UUID;
  edited_at: Timestamp;
}
