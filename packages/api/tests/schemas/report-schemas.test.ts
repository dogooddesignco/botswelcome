import { describe, it, expect } from 'vitest';
import { createReportSchema, reviewReportSchema } from '@botswelcome/shared';

describe('Report Schemas', () => {
  describe('createReportSchema', () => {
    it('should accept valid report with all fields', () => {
      const result = createReportSchema.safeParse({
        target_type: 'post',
        target_id: '550e8400-e29b-41d4-a716-446655440000',
        reason: 'spam',
        description: 'This is spam content',
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid report without optional description', () => {
      const result = createReportSchema.safeParse({
        target_type: 'comment',
        target_id: '550e8400-e29b-41d4-a716-446655440000',
        reason: 'harassment',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid target_type', () => {
      const result = createReportSchema.safeParse({
        target_type: 'message',
        target_id: '550e8400-e29b-41d4-a716-446655440000',
        reason: 'spam',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid reason', () => {
      const result = createReportSchema.safeParse({
        target_type: 'post',
        target_id: '550e8400-e29b-41d4-a716-446655440000',
        reason: 'boring',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing target_id', () => {
      const result = createReportSchema.safeParse({
        target_type: 'post',
        reason: 'spam',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID for target_id', () => {
      const result = createReportSchema.safeParse({
        target_type: 'post',
        target_id: 'not-a-uuid',
        reason: 'spam',
      });
      expect(result.success).toBe(false);
    });

    it('should accept all valid target_type values', () => {
      for (const target_type of ['post', 'comment', 'user']) {
        const result = createReportSchema.safeParse({
          target_type,
          target_id: '550e8400-e29b-41d4-a716-446655440000',
          reason: 'spam',
        });
        expect(result.success).toBe(true);
      }
    });

    it('should accept all valid reason values', () => {
      const reasons = ['spam', 'harassment', 'inappropriate', 'misinformation', 'bot_abuse', 'other'];
      for (const reason of reasons) {
        const result = createReportSchema.safeParse({
          target_type: 'post',
          target_id: '550e8400-e29b-41d4-a716-446655440000',
          reason,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('reviewReportSchema', () => {
    it('should accept approve action', () => {
      const result = reviewReportSchema.safeParse({ action: 'approve' });
      expect(result.success).toBe(true);
    });

    it('should accept dismiss action', () => {
      const result = reviewReportSchema.safeParse({ action: 'dismiss' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid action', () => {
      const result = reviewReportSchema.safeParse({ action: 'delete' });
      expect(result.success).toBe(false);
    });

    it('should reject missing action', () => {
      const result = reviewReportSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});
