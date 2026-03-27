import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../middleware/validate';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import {
  createOperatorTokenSchema,
  updateOperatorTokenSchema,
  updateAgentBudgetSchema,
} from '@botswelcome/shared';
import { operatorService, OperatorServiceError } from '../services/operatorService';
import { agentService, AgentServiceError } from '../services/agentService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

function handleError(err: unknown, next: NextFunction): void {
  if (err instanceof OperatorServiceError || err instanceof AgentServiceError) {
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
      default:
        next(err);
        return;
    }
  }
  next(err);
}

// POST /operator/tokens - create a new operator token
router.post(
  '/tokens',
  requireAuth,
  validate(createOperatorTokenSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as AuthenticatedRequest).user;

      if (user.is_bot) {
        next(AppError.forbidden('Bot accounts cannot create operator tokens'));
        return;
      }

      const { token, rawToken } = await operatorService.createToken(user.id, req.body);

      res.status(201).json({
        success: true,
        data: {
          token: {
            id: token.id,
            label: token.label,
            max_agents: token.max_agents,
            agents_registered: token.agents_registered,
            default_rate_limit_rpm: token.default_rate_limit_rpm,
            default_daily_action_budget: token.default_daily_action_budget,
            is_active: token.is_active,
            created_at: token.created_at,
          },
          operator_token: rawToken,
          warning: 'Store this operator token securely. It will not be shown again.',
        },
      });
    } catch (err) {
      handleError(err, next);
    }
  }
);

// GET /operator/tokens - list own tokens
router.get(
  '/tokens',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const tokens = await operatorService.getTokensByOwner(user.id);

      // Strip sensitive fields
      const safeTokens = tokens.map((t) => ({
        id: t.id,
        label: t.label,
        max_agents: t.max_agents,
        agents_registered: t.agents_registered,
        default_rate_limit_rpm: t.default_rate_limit_rpm,
        default_daily_action_budget: t.default_daily_action_budget,
        default_scoped_communities: t.default_scoped_communities,
        default_scoped_topics: t.default_scoped_topics,
        is_active: t.is_active,
        expires_at: t.expires_at,
        created_at: t.created_at,
        last_used_at: t.last_used_at,
      }));

      res.json({ success: true, data: safeTokens });
    } catch (err) {
      handleError(err, next);
    }
  }
);

// PATCH /operator/tokens/:id - update token settings
router.patch(
  '/tokens/:id',
  requireAuth,
  validate(updateOperatorTokenSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const updated = await operatorService.updateToken(req.params.id, user.id, req.body);

      res.json({ success: true, data: updated });
    } catch (err) {
      handleError(err, next);
    }
  }
);

// DELETE /operator/tokens/:id - revoke token
router.delete(
  '/tokens/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      await operatorService.revokeToken(req.params.id, user.id);

      res.json({ success: true, data: { revoked: true } });
    } catch (err) {
      handleError(err, next);
    }
  }
);

// GET /operator/agents - list all agents owned by this operator
router.get(
  '/agents',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const agents = await operatorService.getAgentsByOwner(user.id);

      res.json({ success: true, data: agents });
    } catch (err) {
      handleError(err, next);
    }
  }
);

// PATCH /operator/agents/:id - update per-agent settings
router.patch(
  '/agents/:id',
  requireAuth,
  validate(updateAgentBudgetSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const agentId = req.params.id;

      // Verify ownership
      const agent = await agentService.getAgent(agentId);
      if (!agent || agent.owner_user_id !== user.id) {
        next(AppError.notFound('Agent not found or not owned by you'));
        return;
      }

      const { db } = await import('../config/database');
      const updateData: Record<string, unknown> = { updated_at: db.fn.now() };

      if (req.body.daily_action_budget !== undefined) updateData.daily_action_budget = req.body.daily_action_budget;
      if (req.body.rate_limit_rpm !== undefined) updateData.rate_limit_rpm = req.body.rate_limit_rpm;
      if (req.body.scoped_communities !== undefined) updateData.scoped_communities = req.body.scoped_communities;
      if (req.body.scoped_topics !== undefined) updateData.scoped_topics = req.body.scoped_topics;
      if (req.body.is_active !== undefined) updateData.is_active = req.body.is_active;

      const [updated] = await db('agents')
        .where({ id: agentId })
        .update(updateData)
        .returning('*');

      res.json({ success: true, data: updated });
    } catch (err) {
      handleError(err, next);
    }
  }
);

// GET /operator/stats - aggregate stats
router.get(
  '/stats',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const stats = await operatorService.getOwnerStats(user.id);

      res.json({ success: true, data: stats });
    } catch (err) {
      handleError(err, next);
    }
  }
);

export default router;
