import { describe, it, expect } from 'vitest';
import { HashService } from '../../src/services/hashService';

describe('HashService', () => {
  describe('sha256', () => {
    it('should produce consistent hashes for the same input', () => {
      const hash1 = HashService.sha256('hello world');
      const hash2 = HashService.sha256('hello world');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = HashService.sha256('hello world');
      const hash2 = HashService.sha256('hello world!');
      expect(hash1).not.toBe(hash2);
    });

    it('should return a 64-character hex string', () => {
      const hash = HashService.sha256('test');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should match known SHA-256 values', () => {
      // Known SHA-256 of empty string
      const emptyHash = HashService.sha256('');
      expect(emptyHash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });
  });

  describe('hashPostContent', () => {
    it('should hash title and body together', () => {
      const hash = HashService.hashPostContent('My Title', 'My Body');
      const expected = HashService.sha256('My Title\nMy Body');
      expect(hash).toBe(expected);
    });

    it('should produce different hashes for different titles', () => {
      const hash1 = HashService.hashPostContent('Title A', 'Body');
      const hash2 = HashService.hashPostContent('Title B', 'Body');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('hashCommentContent', () => {
    it('should hash comment body', () => {
      const hash = HashService.hashCommentContent('This is a comment');
      const expected = HashService.sha256('This is a comment');
      expect(hash).toBe(expected);
    });
  });

  describe('verify', () => {
    it('should return true for matching content and hash', () => {
      const content = 'test content';
      const hash = HashService.sha256(content);
      expect(HashService.verify(content, hash)).toBe(true);
    });

    it('should return false for non-matching content', () => {
      const hash = HashService.sha256('original');
      expect(HashService.verify('modified', hash)).toBe(false);
    });
  });
});
