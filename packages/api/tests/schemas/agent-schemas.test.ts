import { describe, it, expect } from 'vitest';
import {
  registerAgentSchema,
  connectAgentSchema,
  createOperatorTokenSchema,
  updateAgentBudgetSchema,
  submitSelfEvalSchema,
} from '@botswelcome/shared';

const validModelInfo = {
  model_name: 'gpt-4',
  provider: 'openai',
  version: '2024-01',
};

describe('Agent Schemas', () => {
  describe('registerAgentSchema', () => {
    it('should accept valid input', () => {
      const result = registerAgentSchema.safeParse({
        agent_name: 'my-agent',
        description: 'A helpful assistant',
        model_info: validModelInfo,
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid input with all optional fields', () => {
      const result = registerAgentSchema.safeParse({
        agent_name: 'my-agent',
        description: 'A helpful assistant',
        model_info: validModelInfo,
        scoped_communities: ['550e8400-e29b-41d4-a716-446655440000'],
        scoped_topics: ['ai', 'science'],
        instructions: 'Be kind and helpful',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing agent_name', () => {
      const result = registerAgentSchema.safeParse({
        description: 'A helpful assistant',
        model_info: validModelInfo,
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing description', () => {
      const result = registerAgentSchema.safeParse({
        agent_name: 'my-agent',
        model_info: validModelInfo,
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing model_info', () => {
      const result = registerAgentSchema.safeParse({
        agent_name: 'my-agent',
        description: 'A helpful assistant',
      });
      expect(result.success).toBe(false);
    });

    it('should reject agent name shorter than 3 characters', () => {
      const result = registerAgentSchema.safeParse({
        agent_name: 'ab',
        description: 'A helpful assistant',
        model_info: validModelInfo,
      });
      expect(result.success).toBe(false);
    });

    it('should reject agent name with invalid characters', () => {
      const result = registerAgentSchema.safeParse({
        agent_name: 'my agent!',
        description: 'A helpful assistant',
        model_info: validModelInfo,
      });
      expect(result.success).toBe(false);
    });

    it('should reject agent name with spaces', () => {
      const result = registerAgentSchema.safeParse({
        agent_name: 'my agent',
        description: 'A helpful assistant',
        model_info: validModelInfo,
      });
      expect(result.success).toBe(false);
    });

    it('should allow hyphens and underscores in agent name', () => {
      const result = registerAgentSchema.safeParse({
        agent_name: 'my_agent-123',
        description: 'A helpful assistant',
        model_info: validModelInfo,
      });
      expect(result.success).toBe(true);
    });

    it('should reject description longer than 1000 characters', () => {
      const result = registerAgentSchema.safeParse({
        agent_name: 'my-agent',
        description: 'a'.repeat(1001),
        model_info: validModelInfo,
      });
      expect(result.success).toBe(false);
    });

    it('should accept description at exactly 1000 characters', () => {
      const result = registerAgentSchema.safeParse({
        agent_name: 'my-agent',
        description: 'a'.repeat(1000),
        model_info: validModelInfo,
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty description', () => {
      const result = registerAgentSchema.safeParse({
        agent_name: 'my-agent',
        description: '',
        model_info: validModelInfo,
      });
      expect(result.success).toBe(false);
    });

    it('should reject model_info with missing fields', () => {
      const result = registerAgentSchema.safeParse({
        agent_name: 'my-agent',
        description: 'A helpful assistant',
        model_info: { model_name: 'gpt-4' },
      });
      expect(result.success).toBe(false);
    });

    it('should reject agent name longer than 50 characters', () => {
      const result = registerAgentSchema.safeParse({
        agent_name: 'a'.repeat(51),
        description: 'A helpful assistant',
        model_info: validModelInfo,
      });
      expect(result.success).toBe(false);
    });

    it('should accept null instructions', () => {
      const result = registerAgentSchema.safeParse({
        agent_name: 'my-agent',
        description: 'A helpful assistant',
        model_info: validModelInfo,
        instructions: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('connectAgentSchema', () => {
    it('should accept valid input', () => {
      const result = connectAgentSchema.safeParse({
        operator_token: 'tok_abc123',
        agent_name: 'my-agent',
        description: 'A helpful assistant',
        model_info: validModelInfo,
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing operator_token', () => {
      const result = connectAgentSchema.safeParse({
        agent_name: 'my-agent',
        description: 'A helpful assistant',
        model_info: validModelInfo,
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty operator_token', () => {
      const result = connectAgentSchema.safeParse({
        operator_token: '',
        agent_name: 'my-agent',
        description: 'A helpful assistant',
        model_info: validModelInfo,
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid input with optional fields', () => {
      const result = connectAgentSchema.safeParse({
        operator_token: 'tok_abc123',
        agent_name: 'my-agent',
        description: 'A helpful assistant',
        model_info: validModelInfo,
        scoped_communities: ['550e8400-e29b-41d4-a716-446655440000'],
        scoped_topics: ['ai'],
        instructions: 'Follow the rules',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('createOperatorTokenSchema', () => {
    it('should accept empty object and apply defaults', () => {
      const result = createOperatorTokenSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.max_agents).toBe(5);
        expect(result.data.default_rate_limit_rpm).toBe(60);
        expect(result.data.default_daily_action_budget).toBe(100);
      }
    });

    it('should accept custom values', () => {
      const result = createOperatorTokenSchema.safeParse({
        label: 'My Operator',
        max_agents: 10,
        default_rate_limit_rpm: 120,
        default_daily_action_budget: 500,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.max_agents).toBe(10);
        expect(result.data.default_rate_limit_rpm).toBe(120);
        expect(result.data.default_daily_action_budget).toBe(500);
      }
    });

    it('should reject max_agents below 1', () => {
      const result = createOperatorTokenSchema.safeParse({
        max_agents: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject max_agents above 100', () => {
      const result = createOperatorTokenSchema.safeParse({
        max_agents: 101,
      });
      expect(result.success).toBe(false);
    });

    it('should reject rate_limit_rpm above 1000', () => {
      const result = createOperatorTokenSchema.safeParse({
        default_rate_limit_rpm: 1001,
      });
      expect(result.success).toBe(false);
    });

    it('should reject daily_action_budget above 10000', () => {
      const result = createOperatorTokenSchema.safeParse({
        default_daily_action_budget: 10001,
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer max_agents', () => {
      const result = createOperatorTokenSchema.safeParse({
        max_agents: 5.5,
      });
      expect(result.success).toBe(false);
    });

    it('should accept label up to 100 characters', () => {
      const result = createOperatorTokenSchema.safeParse({
        label: 'a'.repeat(100),
      });
      expect(result.success).toBe(true);
    });

    it('should reject label over 100 characters', () => {
      const result = createOperatorTokenSchema.safeParse({
        label: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateAgentBudgetSchema', () => {
    it('should accept valid partial update with daily_action_budget', () => {
      const result = updateAgentBudgetSchema.safeParse({
        daily_action_budget: 200,
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid partial update with rate_limit_rpm', () => {
      const result = updateAgentBudgetSchema.safeParse({
        rate_limit_rpm: 120,
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty object', () => {
      const result = updateAgentBudgetSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept multiple fields', () => {
      const result = updateAgentBudgetSchema.safeParse({
        daily_action_budget: 500,
        rate_limit_rpm: 200,
        is_active: false,
        scoped_communities: ['550e8400-e29b-41d4-a716-446655440000'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject daily_action_budget below 1', () => {
      const result = updateAgentBudgetSchema.safeParse({
        daily_action_budget: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject daily_action_budget above 10000', () => {
      const result = updateAgentBudgetSchema.safeParse({
        daily_action_budget: 10001,
      });
      expect(result.success).toBe(false);
    });

    it('should reject rate_limit_rpm below 1', () => {
      const result = updateAgentBudgetSchema.safeParse({
        rate_limit_rpm: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject rate_limit_rpm above 1000', () => {
      const result = updateAgentBudgetSchema.safeParse({
        rate_limit_rpm: 1001,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid scoped_communities UUIDs', () => {
      const result = updateAgentBudgetSchema.safeParse({
        scoped_communities: ['not-a-uuid'],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('submitSelfEvalSchema', () => {
    const validSelfEvalData = {
      confidence: 0.8,
      tone: 'neutral',
      potential_risks: ['may oversimplify'],
      uncertainty_areas: ['statistics from memory'],
      intent: 'inform',
      limitations: 'no access to current data',
    };

    it('should accept valid input', () => {
      const result = submitSelfEvalSchema.safeParse({
        comment_id: '550e8400-e29b-41d4-a716-446655440000',
        body: 'Self evaluation of my comment',
        self_eval_data: validSelfEvalData,
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing comment_id', () => {
      const result = submitSelfEvalSchema.safeParse({
        body: 'Self evaluation',
        self_eval_data: validSelfEvalData,
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing body', () => {
      const result = submitSelfEvalSchema.safeParse({
        comment_id: '550e8400-e29b-41d4-a716-446655440000',
        self_eval_data: validSelfEvalData,
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing self_eval_data', () => {
      const result = submitSelfEvalSchema.safeParse({
        comment_id: '550e8400-e29b-41d4-a716-446655440000',
        body: 'Self evaluation',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid comment_id (not UUID)', () => {
      const result = submitSelfEvalSchema.safeParse({
        comment_id: 'not-a-uuid',
        body: 'Self evaluation',
        self_eval_data: validSelfEvalData,
      });
      expect(result.success).toBe(false);
    });

    it('should reject confidence outside 0-1 range', () => {
      const result = submitSelfEvalSchema.safeParse({
        comment_id: '550e8400-e29b-41d4-a716-446655440000',
        body: 'Self evaluation',
        self_eval_data: {
          ...validSelfEvalData,
          confidence: 1.5,
        },
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative confidence', () => {
      const result = submitSelfEvalSchema.safeParse({
        comment_id: '550e8400-e29b-41d4-a716-446655440000',
        body: 'Self evaluation',
        self_eval_data: {
          ...validSelfEvalData,
          confidence: -0.1,
        },
      });
      expect(result.success).toBe(false);
    });

    it('should accept confidence at boundaries (0 and 1)', () => {
      const at0 = submitSelfEvalSchema.safeParse({
        comment_id: '550e8400-e29b-41d4-a716-446655440000',
        body: 'Self evaluation',
        self_eval_data: { ...validSelfEvalData, confidence: 0 },
      });
      expect(at0.success).toBe(true);

      const at1 = submitSelfEvalSchema.safeParse({
        comment_id: '550e8400-e29b-41d4-a716-446655440000',
        body: 'Self evaluation',
        self_eval_data: { ...validSelfEvalData, confidence: 1 },
      });
      expect(at1.success).toBe(true);
    });

    it('should reject empty body', () => {
      const result = submitSelfEvalSchema.safeParse({
        comment_id: '550e8400-e29b-41d4-a716-446655440000',
        body: '',
        self_eval_data: validSelfEvalData,
      });
      expect(result.success).toBe(false);
    });
  });
});
