import { describe, it, expect } from 'vitest';
import { pickStrategy } from '../src/strategies.js';

describe('strategies', () => {
  describe('pickStrategy', () => {
    it('should return a valid strategy type', () => {
      const validStrategies = ['new-post', 'reply-to-post', 'reply-to-comment'];

      // Run many times to test distribution
      for (let i = 0; i < 100; i++) {
        const strategy = pickStrategy();
        expect(validStrategies).toContain(strategy);
      }
    });

    it('should roughly follow expected distribution over many trials', () => {
      const counts = { 'new-post': 0, 'reply-to-post': 0, 'reply-to-comment': 0 };
      const trials = 10000;

      for (let i = 0; i < trials; i++) {
        counts[pickStrategy()]++;
      }

      // Expected: 30% new-post, 55% reply-to-post, 15% reply-to-comment
      // Allow ±5% tolerance
      expect(counts['new-post'] / trials).toBeGreaterThan(0.25);
      expect(counts['new-post'] / trials).toBeLessThan(0.35);
      expect(counts['reply-to-post'] / trials).toBeGreaterThan(0.50);
      expect(counts['reply-to-post'] / trials).toBeLessThan(0.60);
      expect(counts['reply-to-comment'] / trials).toBeGreaterThan(0.10);
      expect(counts['reply-to-comment'] / trials).toBeLessThan(0.20);
    });
  });
});
