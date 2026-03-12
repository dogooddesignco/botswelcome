import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
  createMetaCommentSchema,
  createReactionSchema,
  selfEvalDataSchema,
  createPostSchema,
  createCommentSchema,
} from '@botswelcome/shared';

describe('Auth Schemas', () => {
  describe('registerSchema', () => {
    it('should accept valid registration data', () => {
      const result = registerSchema.safeParse({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject short username', () => {
      const result = registerSchema.safeParse({
        username: 'ab',
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject username with special characters', () => {
      const result = registerSchema.safeParse({
        username: 'test user!',
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('should allow hyphens and underscores in username', () => {
      const result = registerSchema.safeParse({
        username: 'test-user_123',
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = registerSchema.safeParse({
        username: 'testuser',
        email: 'not-an-email',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const result = registerSchema.safeParse({
        username: 'testuser',
        email: 'test@example.com',
        password: '1234567',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should accept valid login data', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateProfileSchema', () => {
    it('should accept partial updates', () => {
      const result = updateProfileSchema.safeParse({
        display_name: 'New Name',
      });
      expect(result.success).toBe(true);
    });

    it('should accept null values for clearing fields', () => {
      const result = updateProfileSchema.safeParse({
        display_name: null,
        bio: null,
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty object', () => {
      const result = updateProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject invalid avatar URL', () => {
      const result = updateProfileSchema.safeParse({
        avatar_url: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Meta Schemas', () => {
  describe('createMetaCommentSchema', () => {
    it('should accept basic meta-comment', () => {
      const result = createMetaCommentSchema.safeParse({
        body: 'This response seems sycophantic',
      });
      expect(result.success).toBe(true);
    });

    it('should accept meta-comment with quote selection', () => {
      const result = createMetaCommentSchema.safeParse({
        body: 'This part is misleading',
        quote_selection: {
          quoted_text: 'approximately 40% of studies',
          start_offset: 10,
          end_offset: 38,
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject quote selection where end <= start', () => {
      const result = createMetaCommentSchema.safeParse({
        body: 'Bad range',
        quote_selection: {
          quoted_text: 'text',
          start_offset: 10,
          end_offset: 5,
        },
      });
      expect(result.success).toBe(false);
    });

    it('should accept threaded reply with parent_meta_id', () => {
      const result = createMetaCommentSchema.safeParse({
        body: 'I agree with this annotation',
        parent_meta_id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty body', () => {
      const result = createMetaCommentSchema.safeParse({
        body: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createReactionSchema', () => {
    it('should accept valid reaction types', () => {
      const validTypes = [
        'sycophantic', 'hedging', 'misleading', 'manipulative',
        'intellectually_honest', 'genuinely_helpful', 'accurate',
        'appropriate_uncertainty', 'insightful', 'off_topic',
        'dangerous', 'courageous',
      ];

      for (const type of validTypes) {
        const result = createReactionSchema.safeParse({ reaction_type: type });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid reaction type', () => {
      const result = createReactionSchema.safeParse({
        reaction_type: 'thumbs_up',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('selfEvalDataSchema', () => {
    it('should accept valid self-evaluation', () => {
      const result = selfEvalDataSchema.safeParse({
        confidence: 0.7,
        tone: 'neutral',
        potential_risks: ['may oversimplify'],
        uncertainty_areas: ['statistics from memory'],
        intent: 'inform',
        limitations: 'no access to current data',
      });
      expect(result.success).toBe(true);
    });

    it('should reject confidence outside 0-1 range', () => {
      const result = selfEvalDataSchema.safeParse({
        confidence: 1.5,
        tone: 'neutral',
        potential_risks: [],
        uncertainty_areas: [],
        intent: 'inform',
        limitations: '',
      });
      expect(result.success).toBe(false);
    });

    it('should accept confidence at boundaries', () => {
      expect(selfEvalDataSchema.safeParse({
        confidence: 0, tone: 'a', potential_risks: [], uncertainty_areas: [], intent: 'a', limitations: '',
      }).success).toBe(true);

      expect(selfEvalDataSchema.safeParse({
        confidence: 1, tone: 'a', potential_risks: [], uncertainty_areas: [], intent: 'a', limitations: '',
      }).success).toBe(true);
    });
  });
});

describe('Content Schemas', () => {
  describe('createPostSchema', () => {
    it('should accept valid text post', () => {
      const result = createPostSchema.safeParse({
        title: 'My First Post',
        body: 'This is the content of my post',
        post_type: 'text',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty title', () => {
      const result = createPostSchema.safeParse({
        title: '',
        body: 'Content',
        post_type: 'text',
      });
      expect(result.success).toBe(false);
    });

    it('should require URL for link posts', () => {
      const result = createPostSchema.safeParse({
        title: 'A Link',
        body: 'Check this out',
        post_type: 'link',
      });
      expect(result.success).toBe(false);
    });

    it('should accept link post with URL', () => {
      const result = createPostSchema.safeParse({
        title: 'A Link',
        body: 'Check this out',
        post_type: 'link',
        url: 'https://example.com',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('createCommentSchema', () => {
    it('should accept valid comment', () => {
      const result = createCommentSchema.safeParse({
        body: 'Great post!',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty body', () => {
      const result = createCommentSchema.safeParse({
        body: '',
      });
      expect(result.success).toBe(false);
    });
  });
});
