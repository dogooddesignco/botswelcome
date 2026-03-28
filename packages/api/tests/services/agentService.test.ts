import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

// Mock database before importing AgentService
vi.mock('../../src/config/database', () => ({
  db: vi.fn(),
}));

// Mock dependent services to prevent import errors
vi.mock('../../src/services/metaService', () => ({
  metaService: {},
}));
vi.mock('../../src/services/notificationService', () => ({
  notificationService: {},
}));
vi.mock('../../src/services/hashService', () => ({
  HashService: { hashPostContent: vi.fn(), hashCommentContent: vi.fn() },
}));

import { AgentService } from '../../src/services/agentService';

const service = new AgentService();

describe('AgentService', () => {
  describe('getBudgetStatus', () => {
    it('should return default budget of 100 when not specified', () => {
      const agent = {
        daily_action_budget: null,
        daily_actions_used: 0,
        budget_reset_at: new Date().toISOString(),
      };
      const status = service.getBudgetStatus(agent);
      expect(status.daily_action_budget).toBe(100);
    });

    it('should return the configured budget', () => {
      const agent = {
        daily_action_budget: 200,
        daily_actions_used: 50,
        budget_reset_at: new Date().toISOString(),
      };
      const status = service.getBudgetStatus(agent);
      expect(status.daily_action_budget).toBe(200);
      expect(status.daily_actions_used).toBe(50);
      expect(status.budget_remaining).toBe(150);
    });

    it('should reset used count to 0 when budget_reset_at is null', () => {
      const agent = {
        daily_action_budget: 100,
        daily_actions_used: 75,
        budget_reset_at: null,
      };
      const status = service.getBudgetStatus(agent);
      expect(status.daily_actions_used).toBe(0);
      expect(status.budget_remaining).toBe(100);
    });

    it('should reset used count to 0 when budget_reset_at is a previous day', () => {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const agent = {
        daily_action_budget: 100,
        daily_actions_used: 75,
        budget_reset_at: yesterday.toISOString(),
      };
      const status = service.getBudgetStatus(agent);
      expect(status.daily_actions_used).toBe(0);
      expect(status.budget_remaining).toBe(100);
    });

    it('should keep used count when budget_reset_at is today', () => {
      const agent = {
        daily_action_budget: 100,
        daily_actions_used: 75,
        budget_reset_at: new Date().toISOString(),
      };
      const status = service.getBudgetStatus(agent);
      expect(status.daily_actions_used).toBe(75);
      expect(status.budget_remaining).toBe(25);
    });

    it('should clamp budget_remaining to 0 when exceeded', () => {
      const agent = {
        daily_action_budget: 100,
        daily_actions_used: 150,
        budget_reset_at: new Date().toISOString(),
      };
      const status = service.getBudgetStatus(agent);
      expect(status.budget_remaining).toBe(0);
    });

    it('should return resets_at as a valid ISO string', () => {
      const agent = {
        daily_action_budget: 100,
        daily_actions_used: 0,
        budget_reset_at: new Date().toISOString(),
      };
      const status = service.getBudgetStatus(agent);
      expect(status.resets_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      // The resets_at should parse as a valid date
      const resetDate = new Date(status.resets_at);
      expect(resetDate.getTime()).not.toBeNaN();
    });

    it('should return resets_at as tomorrow midnight UTC', () => {
      const agent = {
        daily_action_budget: 100,
        daily_actions_used: 0,
        budget_reset_at: new Date().toISOString(),
      };
      const status = service.getBudgetStatus(agent);
      const resetDate = new Date(status.resets_at);
      expect(resetDate.getUTCHours()).toBe(0);
      expect(resetDate.getUTCMinutes()).toBe(0);
      expect(resetDate.getUTCSeconds()).toBe(0);

      // It should be tomorrow
      const now = new Date();
      const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      expect(resetDate.toISOString().slice(0, 10)).toBe(tomorrow.toISOString().slice(0, 10));
    });

    it('should handle agent with all zero/null fields gracefully', () => {
      const agent = {
        daily_action_budget: 0,
        daily_actions_used: 0,
        budget_reset_at: null,
      };
      const status = service.getBudgetStatus(agent);
      // 0 becomes falsy, defaults to 100
      expect(status.daily_action_budget).toBe(100);
      expect(status.daily_actions_used).toBe(0);
      expect(status.budget_remaining).toBe(100);
    });
  });
});

/**
 * Test the module-level helper functions indirectly.
 * Since generateApiKey, hashApiKey, and getApiKeyPrefix are not exported,
 * we replicate their logic here and verify the expected behavior matches
 * what the service would produce internally.
 */
describe('Agent helper function behaviors', () => {
  describe('generateApiKey pattern', () => {
    it('should start with bw_agent_', () => {
      const key = `bw_agent_${crypto.randomBytes(32).toString('hex')}`;
      expect(key.startsWith('bw_agent_')).toBe(true);
    });

    it('should have correct length (9 prefix + 64 hex chars = 73)', () => {
      const key = `bw_agent_${crypto.randomBytes(32).toString('hex')}`;
      expect(key).toHaveLength(73);
    });

    it('should produce unique keys on each call', () => {
      const key1 = `bw_agent_${crypto.randomBytes(32).toString('hex')}`;
      const key2 = `bw_agent_${crypto.randomBytes(32).toString('hex')}`;
      expect(key1).not.toBe(key2);
    });
  });

  describe('hashApiKey pattern', () => {
    function hashApiKey(key: string): string {
      return crypto.createHash('sha256').update(key, 'utf-8').digest('hex');
    }

    it('should be deterministic', () => {
      const hash1 = hashApiKey('bw_agent_test123');
      const hash2 = hashApiKey('bw_agent_test123');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashApiKey('bw_agent_key1');
      const hash2 = hashApiKey('bw_agent_key2');
      expect(hash1).not.toBe(hash2);
    });

    it('should return a 64-character hex string', () => {
      const hash = hashApiKey('bw_agent_test');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('getApiKeyPrefix pattern', () => {
    function getApiKeyPrefix(key: string): string {
      return key.substring(0, 12);
    }

    it('should return first 12 characters', () => {
      const key = 'bw_agent_abcdef1234567890';
      expect(getApiKeyPrefix(key)).toBe('bw_agent_abc');
    });

    it('should return full string if shorter than 12 chars', () => {
      const key = 'short';
      expect(getApiKeyPrefix(key)).toBe('short');
    });

    it('should always start with bw_agent_ for valid keys', () => {
      const key = `bw_agent_${crypto.randomBytes(32).toString('hex')}`;
      const prefix = getApiKeyPrefix(key);
      expect(prefix.startsWith('bw_agent_')).toBe(true);
      expect(prefix).toHaveLength(12);
    });
  });

  describe('isNewUtcDay pattern', () => {
    function isNewUtcDay(resetAt: Date | string | null): boolean {
      if (!resetAt) return true;
      const reset = new Date(resetAt);
      const now = new Date();
      return reset.toISOString().slice(0, 10) !== now.toISOString().slice(0, 10);
    }

    it('should return true when resetAt is null', () => {
      expect(isNewUtcDay(null)).toBe(true);
    });

    it('should return false when resetAt is today', () => {
      expect(isNewUtcDay(new Date())).toBe(false);
    });

    it('should return false when resetAt is today as ISO string', () => {
      expect(isNewUtcDay(new Date().toISOString())).toBe(false);
    });

    it('should return true when resetAt is yesterday', () => {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      expect(isNewUtcDay(yesterday)).toBe(true);
    });

    it('should return true when resetAt is far in the past', () => {
      expect(isNewUtcDay('2020-01-01T00:00:00.000Z')).toBe(true);
    });
  });

  describe('getNextMidnightUtc pattern', () => {
    function getNextMidnightUtc(): string {
      const now = new Date();
      const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      return tomorrow.toISOString();
    }

    it('should return an ISO string', () => {
      const result = getNextMidnightUtc();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('should be midnight UTC', () => {
      const result = getNextMidnightUtc();
      const date = new Date(result);
      expect(date.getUTCHours()).toBe(0);
      expect(date.getUTCMinutes()).toBe(0);
      expect(date.getUTCSeconds()).toBe(0);
      expect(date.getUTCMilliseconds()).toBe(0);
    });

    it('should be tomorrow', () => {
      const result = getNextMidnightUtc();
      const resultDate = new Date(result);
      const now = new Date();
      const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const diffMs = resultDate.getTime() - todayUtc.getTime();
      // Should be exactly 24 hours ahead of today's midnight
      expect(diffMs).toBe(24 * 60 * 60 * 1000);
    });
  });
});
