import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../middleware/validate';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireAgentAuth, AgentRequest } from '../middleware/agentAuth';
import {
  registerAgentSchema,
  updateAgentSchema,
  submitSelfEvalSchema,
} from '@botswelcome/shared';
import { agentService, AgentServiceError } from '../services/agentService';
import { metaService, MetaServiceError } from '../services/metaService';
import { reputationService } from '../services/reputationService';
import { notificationService } from '../services/notificationService';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

const router = Router();

function handleAgentError(err: unknown, next: NextFunction): void {
  if (err instanceof AgentServiceError) {
    switch (err.code) {
      case 'NOT_FOUND':
        next(AppError.notFound(err.message));
        return;
      case 'FORBIDDEN':
        next(AppError.forbidden(err.message));
        return;
      case 'UNAUTHORIZED':
        next(AppError.unauthorized(err.message));
        return;
      case 'CONFLICT':
        next(AppError.conflict(err.message));
        return;
      case 'BUDGET_EXCEEDED':
        next(AppError.tooManyRequests(err.message));
        return;
      default:
        next(err);
        return;
    }
  }
  if (err instanceof MetaServiceError) {
    switch (err.code) {
      case 'NOT_FOUND':
        next(AppError.notFound(err.message));
        return;
      case 'FORBIDDEN':
        next(AppError.forbidden(err.message));
        return;
      case 'CONFLICT':
        next(AppError.conflict(err.message));
        return;
      default:
        next(err);
        return;
    }
  }
  next(err);
}

// ============================================================
// Public endpoints
// ============================================================

// GET /agents/directory - public agent listing
router.get(
  '/directory',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;

      const { db } = await import('../config/database');
      const [{ count }] = await db('agents')
        .join('users', 'users.id', 'agents.user_id')
        .where({ 'agents.is_active': true })
        .count();
      const total = Number(count);

      const agents = await db('agents')
        .join('users', 'users.id', 'agents.user_id')
        .where({ 'agents.is_active': true })
        .select(
          'agents.id',
          'agents.user_id',
          'agents.agent_name',
          'agents.description',
          'agents.model_info',
          'agents.scoped_communities',
          'agents.scoped_topics',
          'agents.is_active',
          'agents.created_at',
          'users.username',
        )
        .orderBy('agents.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          data: agents,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// Human-owner authenticated endpoints
// ============================================================

// POST /agents - register a new agent
router.post(
  '/',
  requireAuth,
  validate(registerAgentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as AuthenticatedRequest).user;

      if (user.is_bot) {
        next(AppError.forbidden('Bot accounts cannot register agents'));
        return;
      }

      const { agent, apiKey } = await agentService.registerAgent(user.id, req.body);

      res.status(201).json({
        success: true,
        data: {
          agent,
          api_key: apiKey,
          warning: 'Store this API key securely. It will not be shown again.',
        },
      });
    } catch (err) {
      handleAgentError(err, next);
    }
  }
);

// GET /agents - list own agents
router.get(
  '/',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const agents = await agentService.getAgentsByOwner(user.id);

      res.json({ success: true, data: agents });
    } catch (err) {
      next(err);
    }
  }
);

// GET /agents/:id - get agent details (public)
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agent = await agentService.getAgent(req.params.id);

      if (!agent) {
        next(AppError.notFound('Agent not found'));
        return;
      }

      // Return public-safe fields (strip api_key_hash, api_key_prefix)
      const publicAgent = {
        id: agent.id,
        user_id: agent.user_id,
        agent_name: agent.agent_name,
        description: agent.description,
        model_info: agent.model_info,
        scoped_communities: agent.scoped_communities,
        scoped_topics: agent.scoped_topics,
        is_active: agent.is_active,
        created_at: agent.created_at,
        updated_at: agent.updated_at,
      };

      res.json({ success: true, data: publicAgent });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /agents/:id - update agent (ownership required)
router.patch(
  '/:id',
  requireAuth,
  validate(updateAgentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const updated = await agentService.updateAgent(req.params.id, user.id, req.body);

      res.json({ success: true, data: updated });
    } catch (err) {
      handleAgentError(err, next);
    }
  }
);

// DELETE /agents/:id - deactivate agent (ownership required)
router.delete(
  '/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      await agentService.deactivateAgent(req.params.id, user.id);

      res.json({ success: true, data: { deactivated: true } });
    } catch (err) {
      handleAgentError(err, next);
    }
  }
);

// POST /agents/:id/rotate-key - rotate API key (ownership required)
router.post(
  '/:id/rotate-key',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const { agent, apiKey } = await agentService.rotateApiKey(req.params.id, user.id);

      res.json({
        success: true,
        data: {
          agent,
          api_key: apiKey,
          warning: 'Store this API key securely. It will not be shown again. The old key is now invalid.',
        },
      });
    } catch (err) {
      handleAgentError(err, next);
    }
  }
);

// ============================================================
// Agent-authenticated endpoints (use X-Agent-API-Key header)
// ============================================================

// POST /agents/agent/posts - create post as agent
const agentCreatePostSchema = z.object({
  community_id: z.string().uuid(),
  title: z.string().min(1).max(300),
  body: z.string().max(40000),
  post_type: z.enum(['text', 'link', 'question']),
  self_eval: z
    .object({
      body: z.string().min(1).max(10000),
      self_eval_data: z.object({
        confidence: z.number().min(0).max(1),
        tone: z.string().min(1),
        potential_risks: z.array(z.string()),
        uncertainty_areas: z.array(z.string()),
        intent: z.string().min(1),
        limitations: z.string(),
      }),
    })
    .optional(),
});

router.post(
  '/agent/posts',
  requireAgentAuth,
  validate(agentCreatePostSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agent = (req as AgentRequest).agent;
      const { community_id, title, body, post_type, self_eval } = req.body;

      const result = await agentService.agentCreatePost(
        agent.id,
        community_id,
        title,
        body,
        post_type,
        self_eval
      );

      res.status(201).json({ success: true, data: result });
    } catch (err) {
      handleAgentError(err, next);
    }
  }
);

// POST /agents/agent/comments - create comment as agent
const agentCreateCommentSchema = z.object({
  post_id: z.string().uuid(),
  body: z.string().min(1).max(10000),
  parent_id: z.string().uuid().optional().nullable(),
  self_eval: z
    .object({
      body: z.string().min(1).max(10000),
      self_eval_data: z.object({
        confidence: z.number().min(0).max(1),
        tone: z.string().min(1),
        potential_risks: z.array(z.string()),
        uncertainty_areas: z.array(z.string()),
        intent: z.string().min(1),
        limitations: z.string(),
      }),
    })
    .optional(),
});

router.post(
  '/agent/comments',
  requireAgentAuth,
  validate(agentCreateCommentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agent = (req as AgentRequest).agent;
      const { post_id, body, parent_id, self_eval } = req.body;

      const result = await agentService.agentCreateComment(
        agent.id,
        post_id,
        body,
        parent_id,
        self_eval
      );

      res.status(201).json({ success: true, data: result });
    } catch (err) {
      handleAgentError(err, next);
    }
  }
);

// POST /agents/agent/self-eval - submit self-evaluation for existing comment
router.post(
  '/agent/self-eval',
  requireAgentAuth,
  validate(submitSelfEvalSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agent = (req as AgentRequest).agent;
      const { comment_id, body, self_eval_data } = req.body;

      const selfEvalMeta = await metaService.createSelfEval(
        comment_id,
        agent.user_id,
        self_eval_data,
        body
      );

      res.status(201).json({ success: true, data: selfEvalMeta });
    } catch (err) {
      handleAgentError(err, next);
    }
  }
);

// GET /agents/agent/whoami - get own profile, budget status, and platform rules
router.get(
  '/agent/whoami',
  requireAgentAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agentReq = req as AgentRequest;
      const agent = await agentService.getAgent(agentReq.agent.id);

      if (!agent) {
        next(AppError.notFound('Agent not found'));
        return;
      }

      const { operatorService } = await import('../services/operatorService');
      const { GETTING_STARTED } = await import('./connect');
      const rules = await operatorService.getActivePlatformRules();
      const platformRules = rules ? rules.rules_json : { version: 0, directives: [] };

      // Calculate budget status
      const budget = agentService.getBudgetStatus(agent);

      res.json({
        success: true,
        data: {
          agent: {
            id: agent.id,
            agent_name: agent.agent_name,
            description: agent.description,
            model_info: agent.model_info,
            scoped_communities: agent.scoped_communities,
            scoped_topics: agent.scoped_topics,
            is_active: agent.is_active,
            rate_limit_rpm: agent.rate_limit_rpm,
          },
          budget,
          platform_rules: platformRules,
          getting_started: GETTING_STARTED,
        },
      });
    } catch (err) {
      handleAgentError(err, next);
    }
  }
);

// GET /agents/agent/notifications - get notifications for this agent
router.get(
  '/agent/notifications',
  requireAgentAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agentReq = req as AgentRequest;
      const unreadOnly = req.query.unread === 'true';
      const limit = Math.min(Number(req.query.limit) || 50, 100);

      const notifications = await notificationService.getForUser(
        agentReq.agent.user_id,
        { unreadOnly, limit }
      );

      res.json({ success: true, data: notifications });
    } catch (err) {
      handleAgentError(err, next);
    }
  }
);

// POST /agents/agent/notifications/read - mark notifications as read
router.post(
  '/agent/notifications/read',
  requireAgentAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agentReq = req as AgentRequest;
      const { notification_ids } = req.body ?? {};

      const count = await notificationService.markRead(
        agentReq.agent.user_id,
        Array.isArray(notification_ids) ? notification_ids : undefined
      );

      res.json({ success: true, data: { marked_read: count } });
    } catch (err) {
      handleAgentError(err, next);
    }
  }
);

// GET /agents/agent/context/:postId - get discussion context optimized for LLM
const contextQuerySchema = z.object({
  depth: z.coerce.number().int().min(1).max(100).optional().default(10),
  include_meta: z.coerce.boolean().optional().default(true),
});

router.get(
  '/agent/context/:postId',
  requireAgentAuth,
  validate(contextQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { postId } = req.params;
      const depth = parseInt(req.query.depth as string, 10) || 10;
      const includeMeta = req.query.include_meta !== 'false';

      const context = await agentService.getAgentContext(postId, depth, includeMeta);

      res.json({ success: true, data: context });
    } catch (err) {
      handleAgentError(err, next);
    }
  }
);

// ==========================================
// Reputation convenience routes on /agents/:id
// (Also available under /reputation/agents/:id)
// ==========================================

// GET /agents/:id/reputation - get agent reputation summary
router.get('/:id/reputation', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const period = (req.query.period as string) || 'all';

    let reputation = await reputationService.getAgentReputation(id, period);
    if (!reputation) {
      reputation = await reputationService.computeReputation(id, period);
    }

    res.json({ success: true, data: reputation });
  } catch (err) {
    handleAgentError(err, next);
  }
});

// GET /agents/:id/reputation/history - reputation over time
router.get('/:id/reputation/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 30));
    const history = await reputationService.getReputationHistory(id, limit);
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
});

export default router;
