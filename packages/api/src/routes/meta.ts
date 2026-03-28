import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../middleware/validate';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { createMetaCommentSchema, createReactionSchema } from '@botswelcome/shared';
import { metaService, MetaServiceError } from '../services/metaService';
import { notificationService } from '../services/notificationService';
import { AppError } from '../middleware/errorHandler';
import { db } from '../config/database';
import { z } from 'zod';

const router = Router();

function handleMetaError(err: unknown, next: NextFunction): void {
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

// GET /meta/comments/:commentId - get meta-comments for a comment
router.get('/comments/:commentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { commentId } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));

    const { data, total } = await metaService.getMetaComments(commentId, page, limit);
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
});

// POST /meta/comments/:commentId - create meta-comment
router.post(
  '/comments/:commentId',
  requireAuth,
  validate(createMetaCommentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { commentId } = req.params;
      const user = (req as AuthenticatedRequest).user;

      const metaComment = await metaService.createMetaComment(
        commentId,
        user.id,
        req.body
      );

      res.status(201).json({ success: true, data: metaComment });
    } catch (err) {
      handleMetaError(err, next);
    }
  }
);

// PATCH /meta/:metaId - edit meta-comment
const updateMetaSchema = z.object({
  body: z.string().min(1).max(10000),
});

router.patch(
  '/:metaId',
  requireAuth,
  validate(updateMetaSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { metaId } = req.params;
      const user = (req as AuthenticatedRequest).user;

      const updated = await metaService.updateMetaComment(metaId, user.id, req.body.body);

      res.json({ success: true, data: updated });
    } catch (err) {
      handleMetaError(err, next);
    }
  }
);

// DELETE /meta/:metaId - soft delete meta-comment
router.delete(
  '/:metaId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { metaId } = req.params;
      const user = (req as AuthenticatedRequest).user;

      await metaService.deleteMetaComment(metaId, user.id);

      res.json({ success: true, data: { deleted: true } });
    } catch (err) {
      handleMetaError(err, next);
    }
  }
);

// POST /meta/:metaId/vote - vote on meta-comment
const voteSchema = z.object({
  value: z.union([z.literal(1), z.literal(-1)]),
});

router.post(
  '/:metaId/vote',
  requireAuth,
  validate(voteSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { metaId } = req.params;
      const user = (req as AuthenticatedRequest).user;
      const { value } = req.body;

      const updated = await metaService.voteOnMetaComment(metaId, user.id, value);

      res.json({ success: true, data: updated });
    } catch (err) {
      handleMetaError(err, next);
    }
  }
);

// GET /meta/comments/:commentId/reactions - get reaction counts
router.get(
  '/comments/:commentId/reactions',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { commentId } = req.params;
      const counts = await metaService.getReactions(commentId);

      res.json({ success: true, data: { comment_id: commentId, counts } });
    } catch (err) {
      next(err);
    }
  }
);

// POST /meta/comments/:commentId/reactions - add reaction
router.post(
  '/comments/:commentId/reactions',
  requireAuth,
  validate(createReactionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { commentId } = req.params;
      const user = (req as AuthenticatedRequest).user;
      const { reaction_type } = req.body;

      const reaction = await metaService.addReaction(commentId, user.id, reaction_type);

      // Notify the comment author about the reaction
      try {
        const comment = await db('comments').where({ id: commentId }).first();
        if (comment) {
          notificationService.create(
            comment.author_id,
            'reaction',
            user.id,
            'comment',
            commentId
          );
        }
      } catch { /* non-critical */ }

      res.status(201).json({ success: true, data: reaction });
    } catch (err) {
      handleMetaError(err, next);
    }
  }
);

// DELETE /meta/comments/:commentId/reactions/:type - remove reaction
router.delete(
  '/comments/:commentId/reactions/:type',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { commentId, type } = req.params;
      const user = (req as AuthenticatedRequest).user;

      await metaService.removeReaction(commentId, user.id, type);

      res.json({ success: true, data: { removed: true } });
    } catch (err) {
      handleMetaError(err, next);
    }
  }
);

// GET /meta/comments/:commentId/highlights - get highlight/quote-selection data
router.get(
  '/comments/:commentId/highlights',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { commentId } = req.params;
      const highlights = await metaService.getHighlights(commentId);

      res.json({ success: true, data: { comment_id: commentId, highlights } });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
