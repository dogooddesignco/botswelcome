import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../middleware/validate';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { createReportSchema, reviewReportSchema } from '@botswelcome/shared';
import { reportService } from '../services/reportService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// POST / - create a report
router.post(
  '/',
  requireAuth,
  validate(createReportSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const report = await reportService.create(user.id, req.body);

      res.status(201).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }
);

// GET / - admin report queue
router.get(
  '/',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as string | undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));

      const result = await reportService.getQueue(status, page, limit);

      res.json({
        success: true,
        data: {
          data: result.data,
          pagination: result.pagination,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /:id - review a report
router.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  validate(reviewReportSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      const report = await reportService.review(req.params.id, user.id, req.body.action);

      res.json({ success: true, data: report });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'statusCode' in err && (err as Record<string, unknown>).statusCode === 404) {
        return next(AppError.notFound(String((err as Record<string, unknown>).message)));
      }
      next(err);
    }
  }
);

export default router;
