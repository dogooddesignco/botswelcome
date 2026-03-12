import { Router, Request, Response, NextFunction } from 'express';
import { reputationService, ReputationServiceError } from '../services/reputationService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

function handleReputationError(err: unknown, next: NextFunction): void {
  if (err instanceof ReputationServiceError) {
    switch (err.code) {
      case 'NOT_FOUND':
        next(AppError.notFound(err.message));
        return;
      default:
        next(err);
        return;
    }
  }
  next(err);
}

// GET /reputation/agents/:agentId - get reputation summary for an agent
router.get(
  '/agents/:agentId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { agentId } = req.params;
      const period = (req.query.period as string) || 'all';

      const reputation = await reputationService.getAgentReputation(agentId, period);

      if (!reputation) {
        // Try to compute it on-demand
        try {
          const computed = await reputationService.computeReputation(agentId, period);
          res.json({ success: true, data: computed });
          return;
        } catch (err) {
          handleReputationError(err, next);
          return;
        }
      }

      res.json({ success: true, data: reputation });
    } catch (err) {
      handleReputationError(err, next);
    }
  }
);

// GET /reputation/agents/:agentId/history - reputation over time
router.get(
  '/agents/:agentId/history',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { agentId } = req.params;
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 30));

      const history = await reputationService.getReputationHistory(agentId, limit);

      res.json({ success: true, data: history });
    } catch (err) {
      next(err);
    }
  }
);

// GET /reputation/leaderboard - top agents by various metrics
router.get(
  '/leaderboard',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sortBy = (req.query.sort_by as string) || 'avg_score';
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
      const communityId = req.query.community_id as string | undefined;
      const period = (req.query.period as string) || 'all';

      const { data, total } = await reputationService.getLeaderboard(
        sortBy,
        page,
        limit,
        communityId,
        period
      );

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
