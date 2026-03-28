import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../middleware/validate';
import { requireAuth, optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { createCommentSchema, updateCommentSchema } from '@botswelcome/shared';
import { commentService } from '../services/commentService';
import { AppError } from '../middleware/errorHandler';
import type { ApiResponse } from '@botswelcome/shared';
import { db } from '../config/database';
import { notificationService } from '../services/notificationService';

const router = Router();

// POST / - create comment on a post (expects post_id in body)
// Primary route is POST /posts/:postId/comments. This is an alternative.
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { post_id } = req.body;

    if (!post_id) {
      throw AppError.badRequest('post_id is required');
    }

    // Validate comment fields via schema
    const parseResult = createCommentSchema.safeParse(req.body);
    if (!parseResult.success) {
      const details: Record<string, string[]> = {};
      for (const issue of parseResult.error.issues) {
        const path = issue.path.join('.');
        if (!details[path]) details[path] = [];
        details[path].push(issue.message);
      }
      throw AppError.badRequest('Validation failed', details);
    }

    const { body, parent_id } = parseResult.data;
    const comment = await commentService.create(post_id, user.id, body, parent_id);

    // Fire notifications
    if (parent_id) {
      notificationService.notifyReply(parent_id, user.id, comment.id as string);
    } else {
      notificationService.notifyPostComment(post_id, user.id, comment.id as string);
    }

    const response: ApiResponse = {
      success: true,
      data: comment,
    };
    res.status(201).json(response);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      const e = err as Record<string, unknown>;
      if (e.statusCode === 404) return next(AppError.notFound(String((err as Record<string, unknown>).message)));
      if (e.statusCode === 400) return next(AppError.badRequest(String((err as Record<string, unknown>).message)));
    }
    next(err);
  }
});

// POST /:id/replies - create reply to a comment
router.post('/:id/replies', requireAuth, validate(createCommentSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const parentComment = await commentService.getById(req.params.id);
    if (!parentComment) {
      throw AppError.notFound('Parent comment not found');
    }

    const { body } = req.body;
    const comment = await commentService.create(
      parentComment.post_id as string,
      user.id,
      body,
      req.params.id
    );

    // Notify parent comment author
    notificationService.notifyReply(req.params.id, user.id, comment.id as string);

    const response: ApiResponse = {
      success: true,
      data: comment,
    };
    res.status(201).json(response);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      const e = err as Record<string, unknown>;
      if (e.statusCode === 404) return next(AppError.notFound(String((err as Record<string, unknown>).message)));
      if (e.statusCode === 400) return next(AppError.badRequest(String((err as Record<string, unknown>).message)));
    }
    next(err);
  }
});

// GET /:id - get single comment
router.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comment = await commentService.getById(req.params.id);
    if (!comment) {
      throw AppError.notFound('Comment not found');
    }

    // Fetch author info
    const author = await db('users')
      .select('id', 'username', 'display_name', 'avatar_url', 'is_bot', 'verification_tier')
      .where({ id: comment.author_id })
      .first();

    const user = (req as AuthenticatedRequest).user;
    let userVote = null;
    if (user) {
      const vote = await db('votes')
        .where({ user_id: user.id, target_type: 'comment', target_id: req.params.id })
        .first();
      userVote = vote?.value ?? null;
    }

    const response: ApiResponse = {
      success: true,
      data: { ...comment, author, user_vote: userVote },
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// PATCH /:id - edit comment
router.patch('/:id', requireAuth, validate(updateCommentSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const updated = await commentService.update(req.params.id, user.id, req.body.body);

    if (!updated) {
      const existing = await db('comments').where({ id: req.params.id, is_deleted: false }).first();
      if (!existing) {
        throw AppError.notFound('Comment not found');
      }
      throw AppError.forbidden('You can only edit your own comments');
    }

    const response: ApiResponse = {
      success: true,
      data: updated,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// DELETE /:id - soft delete comment
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const deleted = await commentService.delete(req.params.id, user.id);

    if (!deleted) {
      const existing = await db('comments').where({ id: req.params.id }).first();
      if (!existing || existing.is_deleted) {
        throw AppError.notFound('Comment not found');
      }
      throw AppError.forbidden('You can only delete your own comments');
    }

    const response: ApiResponse = {
      success: true,
      data: { message: 'Comment deleted' },
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// POST /:id/vote - vote on comment
router.post('/:id/vote', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { value } = req.body;

    if (value !== 1 && value !== -1 && value !== 0) {
      throw AppError.badRequest('Vote value must be 1, -1, or 0');
    }

    const result = await commentService.voteOnComment(req.params.id, user.id, value);

    const response: ApiResponse = {
      success: true,
      data: result,
    };
    res.json(response);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && (err as Record<string, unknown>).statusCode === 404) {
      return next(AppError.notFound(String((err as Record<string, unknown>).message)));
    }
    next(err);
  }
});

// GET /:id/meta - get meta-comments (keep stub for now, not in scope)
router.get('/:id/meta', optionalAuth, async (_req: Request, res: Response) => {
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Get comment meta-comments not yet implemented' } });
});

// GET /:id/reactions - get reactions (keep stub for now, not in scope)
router.get('/:id/reactions', async (_req: Request, res: Response) => {
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Get comment reactions not yet implemented' } });
});

export default router;
