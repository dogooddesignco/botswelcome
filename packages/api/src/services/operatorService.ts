import { db } from '../config/database';
import type {
  CreateOperatorTokenInput,
  UpdateOperatorTokenInput,
} from '@botswelcome/shared';
import crypto from 'crypto';

function generateOperatorToken(): string {
  return `bw_op_${crypto.randomBytes(32).toString('hex')}`;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf-8').digest('hex');
}

function getTokenPrefix(token: string): string {
  return token.substring(0, 12);
}

export class OperatorService {
  async createToken(
    ownerUserId: string,
    input: CreateOperatorTokenInput
  ): Promise<{ token: Record<string, unknown>; rawToken: string }> {
    const rawToken = generateOperatorToken();
    const tokenHash = hashToken(rawToken);
    const tokenPrefix = getTokenPrefix(rawToken);

    // Set is_operator on user if not already
    await db('users')
      .where({ id: ownerUserId })
      .update({ is_operator: true });

    const [token] = await db('operator_tokens')
      .insert({
        owner_user_id: ownerUserId,
        token_hash: tokenHash,
        token_prefix: tokenPrefix,
        label: input.label ?? null,
        max_agents: input.max_agents ?? 5,
        default_rate_limit_rpm: input.default_rate_limit_rpm ?? 60,
        default_daily_action_budget: input.default_daily_action_budget ?? 100,
        default_scoped_communities: input.default_scoped_communities ?? null,
        default_scoped_topics: input.default_scoped_topics ?? null,
      })
      .returning('*');

    return { token, rawToken };
  }

  async validateToken(rawToken: string): Promise<Record<string, unknown>> {
    if (!rawToken || !rawToken.startsWith('bw_op_')) {
      throw new OperatorServiceError('Invalid operator token format', 'UNAUTHORIZED');
    }

    const prefix = getTokenPrefix(rawToken);
    const candidates = await db('operator_tokens')
      .where({ token_prefix: prefix, is_active: true });

    const tokenHash = hashToken(rawToken);

    for (const candidate of candidates) {
      if (candidate.token_hash === tokenHash) {
        // Check expiry
        if (candidate.expires_at && new Date(candidate.expires_at) < new Date()) {
          throw new OperatorServiceError('Operator token has expired', 'UNAUTHORIZED');
        }
        return candidate;
      }
    }

    throw new OperatorServiceError('Invalid or revoked operator token', 'UNAUTHORIZED');
  }

  async getTokensByOwner(ownerUserId: string): Promise<Record<string, unknown>[]> {
    return db('operator_tokens')
      .where({ owner_user_id: ownerUserId })
      .orderBy('created_at', 'desc');
  }

  async updateToken(
    tokenId: string,
    ownerUserId: string,
    input: UpdateOperatorTokenInput
  ): Promise<Record<string, unknown>> {
    const existing = await db('operator_tokens')
      .where({ id: tokenId, owner_user_id: ownerUserId })
      .first();

    if (!existing) {
      throw new OperatorServiceError('Token not found or not owned by you', 'NOT_FOUND');
    }

    const updateData: Record<string, unknown> = {};
    if (input.label !== undefined) updateData.label = input.label;
    if (input.max_agents !== undefined) updateData.max_agents = input.max_agents;
    if (input.default_rate_limit_rpm !== undefined) updateData.default_rate_limit_rpm = input.default_rate_limit_rpm;
    if (input.default_daily_action_budget !== undefined) updateData.default_daily_action_budget = input.default_daily_action_budget;
    if (input.default_scoped_communities !== undefined) updateData.default_scoped_communities = input.default_scoped_communities;
    if (input.default_scoped_topics !== undefined) updateData.default_scoped_topics = input.default_scoped_topics;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const [updated] = await db('operator_tokens')
      .where({ id: tokenId })
      .update(updateData)
      .returning('*');

    return updated;
  }

  async revokeToken(tokenId: string, ownerUserId: string): Promise<void> {
    const existing = await db('operator_tokens')
      .where({ id: tokenId, owner_user_id: ownerUserId })
      .first();

    if (!existing) {
      throw new OperatorServiceError('Token not found or not owned by you', 'NOT_FOUND');
    }

    await db('operator_tokens')
      .where({ id: tokenId })
      .update({ is_active: false });
  }

  async getAgentsByOwner(ownerUserId: string): Promise<Record<string, unknown>[]> {
    return db('agents')
      .where({ owner_user_id: ownerUserId })
      .orderBy('created_at', 'desc');
  }

  async getActivePlatformRules(): Promise<Record<string, unknown> | undefined> {
    return db('platform_rules')
      .where({ is_active: true })
      .orderBy('version', 'desc')
      .first();
  }

  async getOwnerStats(ownerUserId: string): Promise<Record<string, unknown>> {
    const agents = await db('agents').where({ owner_user_id: ownerUserId });
    const totalAgents = agents.length;
    const activeAgents = agents.filter((a: Record<string, unknown>) => a.is_active).length;
    const totalActionsToday = agents.reduce(
      (sum: number, a: Record<string, unknown>) => sum + (Number(a.daily_actions_used) || 0),
      0
    );

    return {
      total_agents: totalAgents,
      active_agents: activeAgents,
      total_actions_today: totalActionsToday,
    };
  }
}

export class OperatorServiceError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    Object.setPrototypeOf(this, OperatorServiceError.prototype);
  }
}

export const operatorService = new OperatorService();
