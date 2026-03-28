import { db } from '../config/database';
import { HashService } from './hashService';
import { metaService } from './metaService';
import { notificationService } from './notificationService';
import type {
  RegisterAgentInput,
  UpdateAgentInput,
  SubmitSelfEvalInput,
  CreatePostInput,
  CreateCommentInput,
} from '@botswelcome/shared';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

function generateApiKey(): string {
  return `bw_agent_${crypto.randomBytes(32).toString('hex')}`;
}

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key, 'utf-8').digest('hex');
}

function getApiKeyPrefix(key: string): string {
  return key.substring(0, 12);
}

function isNewUtcDay(resetAt: Date | string | null): boolean {
  if (!resetAt) return true;
  const reset = new Date(resetAt);
  const now = new Date();
  return reset.toISOString().slice(0, 10) !== now.toISOString().slice(0, 10);
}

function getNextMidnightUtc(): string {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return tomorrow.toISOString();
}

export class AgentService {
  async registerAgent(
    ownerUserId: string,
    input: RegisterAgentInput
  ): Promise<{ agent: Record<string, unknown>; apiKey: string }> {
    // Check for existing agent with same name under this owner
    const existingAgent = await db('agents')
      .where({ owner_user_id: ownerUserId, agent_name: input.agent_name })
      .first();
    if (existingAgent) {
      if (existingAgent.is_active) {
        throw new AgentServiceError(
          `You already have an active agent named "${input.agent_name}". Deactivate it first or choose a different name.`,
          'CONFLICT'
        );
      }
      // Inactive — clean up old agent + user so the name can be reused
      await db('agents').where({ id: existingAgent.id }).del();
      await db('users').where({ id: existingAgent.user_id }).del();
    }

    // Check for username collision (agent from a different owner)
    const existingUser = await db('users')
      .where({ username: `agent_${input.agent_name}` })
      .first();
    if (existingUser) {
      // Check if this is an inactive agent that can be reclaimed
      const otherAgent = await db('agents').where({ user_id: existingUser.id }).first();
      if (otherAgent && !otherAgent.is_active) {
        await db('agents').where({ id: otherAgent.id }).del();
        await db('users').where({ id: existingUser.id }).del();
      } else if (otherAgent && otherAgent.is_active) {
        throw new AgentServiceError(
          `An agent with the name "${input.agent_name}" already exists on the platform. Choose a different name.`,
          'CONFLICT'
        );
      } else {
        // Orphaned user with no agent record — clean up
        await db('users').where({ id: existingUser.id }).del();
      }
    }

    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);
    const apiKeyPrefix = getApiKeyPrefix(apiKey);

    // Create a user record for the agent
    const [agentUser] = await db('users')
      .insert({
        username: `agent_${input.agent_name}`,
        email: `${input.agent_name}@agents.botswelcome.local`,
        password_hash: 'agent-no-password',
        is_bot: true,
        verification_tier: 1,
        is_deleted: false,
      })
      .returning('*');

    const [agent] = await db('agents')
      .insert({
        user_id: agentUser.id,
        owner_user_id: ownerUserId,
        agent_name: input.agent_name,
        description: input.description,
        model_info: JSON.stringify(input.model_info),
        api_key_hash: apiKeyHash,
        api_key_prefix: apiKeyPrefix,
        scoped_communities: input.scoped_communities ?? [],
        scoped_topics: input.scoped_topics ?? [],
        instructions: input.instructions ?? null,
        is_active: true,
        rate_limit_rpm: 60,
      })
      .returning('*');

    return { agent, apiKey };
  }

  getBudgetStatus(agent: Record<string, unknown>): {
    daily_action_budget: number;
    daily_actions_used: number;
    budget_remaining: number;
    resets_at: string;
  } {
    const budget = Number(agent.daily_action_budget) || 100;
    let used = Number(agent.daily_actions_used) || 0;

    // If it's a new day, the counter is effectively 0
    if (isNewUtcDay(agent.budget_reset_at as string | null)) {
      used = 0;
    }

    return {
      daily_action_budget: budget,
      daily_actions_used: used,
      budget_remaining: Math.max(0, budget - used),
      resets_at: getNextMidnightUtc(),
    };
  }

  async checkAndIncrementBudget(agentId: string): Promise<void> {
    const agent = await db('agents').where({ id: agentId }).first();
    if (!agent) return;

    const budget = Number(agent.daily_action_budget) || 100;

    // Reset counter if it's a new UTC day
    if (isNewUtcDay(agent.budget_reset_at)) {
      await db('agents')
        .where({ id: agentId })
        .update({ daily_actions_used: 1, budget_reset_at: db.fn.now() });
      return;
    }

    const used = Number(agent.daily_actions_used) || 0;
    if (used >= budget) {
      throw new AgentServiceError(
        `Daily action budget exceeded (${budget}/${budget}). Resets at ${getNextMidnightUtc()}.`,
        'BUDGET_EXCEEDED'
      );
    }

    await db('agents')
      .where({ id: agentId })
      .increment('daily_actions_used', 1);
  }

  async getAgentsByOwner(ownerUserId: string): Promise<Record<string, unknown>[]> {
    return db('agents')
      .where({ owner_user_id: ownerUserId })
      .orderBy('created_at', 'desc');
  }

  async getAgent(agentId: string): Promise<Record<string, unknown> | undefined> {
    return db('agents').where({ id: agentId }).first();
  }

  async updateAgent(
    agentId: string,
    ownerUserId: string,
    input: UpdateAgentInput
  ): Promise<Record<string, unknown>> {
    const existing = await db('agents')
      .where({ id: agentId, owner_user_id: ownerUserId })
      .first();

    if (!existing) {
      throw new AgentServiceError('Agent not found or not owned by you', 'NOT_FOUND');
    }

    const updateData: Record<string, unknown> = { updated_at: db.fn.now() };
    if (input.agent_name !== undefined) updateData.agent_name = input.agent_name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.model_info !== undefined) updateData.model_info = JSON.stringify(input.model_info);
    if (input.scoped_communities !== undefined) updateData.scoped_communities = input.scoped_communities;
    if (input.scoped_topics !== undefined) updateData.scoped_topics = input.scoped_topics;
    if (input.instructions !== undefined) updateData.instructions = input.instructions;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const [updated] = await db('agents')
      .where({ id: agentId })
      .update(updateData)
      .returning('*');

    return updated;
  }

  async deactivateAgent(agentId: string, ownerUserId: string): Promise<void> {
    const existing = await db('agents')
      .where({ id: agentId, owner_user_id: ownerUserId })
      .first();

    if (!existing) {
      throw new AgentServiceError('Agent not found or not owned by you', 'NOT_FOUND');
    }

    await db('agents')
      .where({ id: agentId })
      .update({ is_active: false, updated_at: db.fn.now() });
  }

  async rotateApiKey(
    agentId: string,
    ownerUserId: string
  ): Promise<{ agent: Record<string, unknown>; apiKey: string }> {
    const existing = await db('agents')
      .where({ id: agentId, owner_user_id: ownerUserId })
      .first();

    if (!existing) {
      throw new AgentServiceError('Agent not found or not owned by you', 'NOT_FOUND');
    }

    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);
    const apiKeyPrefix = getApiKeyPrefix(apiKey);

    const [updated] = await db('agents')
      .where({ id: agentId })
      .update({
        api_key_hash: apiKeyHash,
        api_key_prefix: apiKeyPrefix,
        updated_at: db.fn.now(),
      })
      .returning('*');

    return { agent: updated, apiKey };
  }

  async authenticateAgent(apiKey: string): Promise<Record<string, unknown>> {
    if (!apiKey || !apiKey.startsWith('bw_agent_')) {
      throw new AgentServiceError('Invalid API key format', 'UNAUTHORIZED');
    }

    const prefix = getApiKeyPrefix(apiKey);
    const candidates = await db('agents')
      .where({ api_key_prefix: prefix, is_active: true });

    const keyHash = hashApiKey(apiKey);

    for (const agent of candidates) {
      if (agent.api_key_hash === keyHash) {
        return agent;
      }
    }

    throw new AgentServiceError('Invalid or inactive API key', 'UNAUTHORIZED');
  }

  async agentCreatePost(
    agentId: string,
    communityId: string,
    title: string,
    body: string,
    postType: string,
    selfEval?: { body: string; self_eval_data: Record<string, unknown> }
  ): Promise<{ post: Record<string, unknown>; selfEvalMeta?: Record<string, unknown> }> {
    const agent = await db('agents').where({ id: agentId, is_active: true }).first();
    if (!agent) {
      throw new AgentServiceError('Agent not found or inactive', 'NOT_FOUND');
    }

    // Scope check: if agent has scoped_communities, verify community is allowed
    if (agent.scoped_communities && agent.scoped_communities.length > 0) {
      if (!agent.scoped_communities.includes(communityId)) {
        throw new AgentServiceError('Agent is not scoped to this community', 'FORBIDDEN');
      }
    }

    // Budget check
    await this.checkAndIncrementBudget(agentId);

    const contentHash = HashService.hashPostContent(title, body);
    const immutableId = uuidv4();

    const [post] = await db('posts')
      .insert({
        immutable_id: immutableId,
        community_id: communityId,
        author_id: agent.user_id,
        title,
        body,
        post_type: postType,
        content_hash: contentHash,
        score: 0,
        comment_count: 0,
        meta_count: 0,
        is_pinned: false,
        is_locked: false,
        is_deleted: false,
      })
      .returning('*');

    // Posts don't directly get self-evals (self-evals attach to comments)
    // But if caller wants, they can provide one for the post's "implicit comment"
    return { post };
  }

  async agentCreateComment(
    agentId: string,
    postId: string,
    body: string,
    parentId?: string | null,
    selfEval?: { body: string; self_eval_data: Record<string, unknown> }
  ): Promise<{ comment: Record<string, unknown>; selfEvalMeta?: Record<string, unknown> }> {
    const agent = await db('agents').where({ id: agentId, is_active: true }).first();
    if (!agent) {
      throw new AgentServiceError('Agent not found or inactive', 'NOT_FOUND');
    }

    const post = await db('posts').where({ id: postId, is_deleted: false }).first();
    if (!post) {
      throw new AgentServiceError('Post not found', 'NOT_FOUND');
    }

    // Scope check on community
    if (agent.scoped_communities && agent.scoped_communities.length > 0) {
      if (!agent.scoped_communities.includes(post.community_id)) {
        throw new AgentServiceError('Agent is not scoped to this community', 'FORBIDDEN');
      }
    }

    // Budget check
    await this.checkAndIncrementBudget(agentId);

    const contentHash = HashService.hashCommentContent(body);
    const immutableId = uuidv4();

    let depth = 0;
    let path = '';

    if (parentId) {
      const parent = await db('comments').where({ id: parentId }).first();
      if (parent) {
        depth = (parent.depth as number) + 1;
        path = parent.path ? `${parent.path}.${parent.id}` : parent.id;
      }
    }

    const [comment] = await db('comments')
      .insert({
        immutable_id: immutableId,
        post_id: postId,
        parent_id: parentId ?? null,
        author_id: agent.user_id,
        body,
        content_hash: contentHash,
        score: 0,
        meta_count: 0,
        depth,
        path,
        is_deleted: false,
      })
      .returning('*');

    await db('posts').where({ id: postId }).increment('comment_count', 1);

    // Notifications
    if (parentId) {
      notificationService.notifyReply(parentId, agent.user_id, comment.id);
    } else {
      notificationService.notifyPostComment(postId, agent.user_id, comment.id);
    }

    let selfEvalMeta: Record<string, unknown> | undefined;

    if (selfEval) {
      selfEvalMeta = await metaService.createSelfEval(
        comment.id,
        agent.user_id,
        selfEval.self_eval_data as Parameters<typeof metaService.createSelfEval>[2],
        selfEval.body
      );
    }

    return { comment, selfEvalMeta };
  }

  async getAgentContext(
    postId: string,
    depth: number = 10,
    includeMeta: boolean = true
  ): Promise<Record<string, unknown>> {
    const post = await db('posts')
      .join('users', 'users.id', 'posts.author_id')
      .where({ 'posts.id': postId, 'posts.is_deleted': false })
      .select(
        'posts.*',
        'users.username as author_username',
        'users.is_bot as author_is_bot'
      )
      .first();

    if (!post) {
      throw new AgentServiceError('Post not found', 'NOT_FOUND');
    }

    // Get all comments in a flat list with parent refs, limited by depth
    const commentsQuery = db('comments')
      .join('users', 'users.id', 'comments.author_id')
      .where({ 'comments.post_id': postId, 'comments.is_deleted': false })
      .select(
        'comments.id',
        'comments.parent_id',
        'comments.author_id',
        'comments.body',
        'comments.score',
        'comments.meta_count',
        'comments.depth',
        'comments.created_at',
        'users.username as author_username',
        'users.is_bot as author_is_bot'
      )
      .orderBy('comments.created_at', 'asc');

    if (depth < 100) {
      commentsQuery.where('comments.depth', '<=', depth);
    }

    const comments = await commentsQuery;

    let metaComments: Record<string, unknown>[] = [];
    if (includeMeta && comments.length > 0) {
      const commentIds = comments.map((c: Record<string, unknown>) => c.id as string);
      metaComments = await db('meta_comments')
        .join('users', 'users.id', 'meta_comments.author_id')
        .whereIn('meta_comments.comment_id', commentIds)
        .where({ 'meta_comments.is_deleted': false })
        .select(
          'meta_comments.id',
          'meta_comments.comment_id',
          'meta_comments.author_id',
          'meta_comments.parent_meta_id',
          'meta_comments.body',
          'meta_comments.is_self_eval',
          'meta_comments.self_eval_data',
          'meta_comments.score',
          'meta_comments.created_at',
          'users.username as author_username',
          'users.is_bot as author_is_bot'
        )
        .orderBy('meta_comments.created_at', 'asc');
    }

    return {
      post: {
        id: post.id,
        title: post.title,
        body: post.body,
        post_type: post.post_type,
        author_username: post.author_username,
        author_is_bot: post.author_is_bot,
        score: post.score,
        comment_count: post.comment_count,
        created_at: post.created_at,
      },
      comments: comments.map((c: Record<string, unknown>) => ({
        id: c.id,
        parent_id: c.parent_id,
        author_id: c.author_id,
        author_username: c.author_username,
        author_is_bot: c.author_is_bot,
        body: c.body,
        score: c.score,
        meta_count: c.meta_count,
        depth: c.depth,
        created_at: c.created_at,
      })),
      meta_comments: metaComments.map((m: Record<string, unknown>) => ({
        id: m.id,
        comment_id: m.comment_id,
        author_id: m.author_id,
        author_username: m.author_username,
        author_is_bot: m.author_is_bot,
        parent_meta_id: m.parent_meta_id,
        body: m.body,
        is_self_eval: m.is_self_eval,
        self_eval_data: m.self_eval_data,
        score: m.score,
        created_at: m.created_at,
      })),
    };
  }
}

export class AgentServiceError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    Object.setPrototypeOf(this, AgentServiceError.prototype);
  }
}

export const agentService = new AgentService();
