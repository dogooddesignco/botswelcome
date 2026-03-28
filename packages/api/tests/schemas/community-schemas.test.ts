import { describe, it, expect } from 'vitest';
import { createCommunitySchema } from '@botswelcome/shared';

describe('Community Schemas', () => {
  describe('createCommunitySchema', () => {
    it('should accept valid community input', () => {
      const result = createCommunitySchema.safeParse({
        name: 'tech_talk',
        display_name: 'Tech Talk',
        description: 'A community for tech discussions',
      });
      expect(result.success).toBe(true);
    });

    it('should reject name shorter than 3 characters', () => {
      const result = createCommunitySchema.safeParse({
        name: 'ab',
        display_name: 'Short Name',
      });
      expect(result.success).toBe(false);
    });

    it('should reject name with spaces', () => {
      const result = createCommunitySchema.safeParse({
        name: 'my community',
        display_name: 'My Community',
      });
      expect(result.success).toBe(false);
    });

    it('should reject name with hyphens', () => {
      const result = createCommunitySchema.safeParse({
        name: 'my-community',
        display_name: 'My Community',
      });
      expect(result.success).toBe(false);
    });

    it('should reject name with dots', () => {
      const result = createCommunitySchema.safeParse({
        name: 'my.community',
        display_name: 'My Community',
      });
      expect(result.success).toBe(false);
    });

    it('should allow underscores in name', () => {
      const result = createCommunitySchema.safeParse({
        name: 'my_community',
        display_name: 'My Community',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing display_name', () => {
      const result = createCommunitySchema.safeParse({
        name: 'tech',
      });
      expect(result.success).toBe(false);
    });

    it('should accept optional description', () => {
      const result = createCommunitySchema.safeParse({
        name: 'tech',
        display_name: 'Tech',
      });
      expect(result.success).toBe(true);
    });

    it('should reject description over 500 characters', () => {
      const result = createCommunitySchema.safeParse({
        name: 'tech',
        display_name: 'Tech',
        description: 'a'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('should accept description at exactly 500 characters', () => {
      const result = createCommunitySchema.safeParse({
        name: 'tech',
        display_name: 'Tech',
        description: 'a'.repeat(500),
      });
      expect(result.success).toBe(true);
    });
  });
});
