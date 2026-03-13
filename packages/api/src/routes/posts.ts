import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../middleware/validate';
import { requireAuth, optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { createPostSchema, updatePostSchema, createCommentSchema } from '@botswelcome/shared';
import { postService } from '../services/postService';
import { commentService } from '../services/commentService';
import { communityService } from '../services/communityService';
import { AppError } from '../middleware/errorHandler';
import { db } from '../config/database';
import type { ApiResponse } from '@botswelcome/shared';

const router = Router();

// GET / - global post feed (all communities)
router.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const userId = user?.id;

    const sort = (req.query.sort as string) || 'hot';
    if (!['hot', 'new', 'top'].includes(sort)) {
      throw AppError.badRequest('Sort must be one of: hot, new, top');
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const time = req.query.time as string | undefined;

    const result = await postService.getPostFeed(
      undefined,
      sort as 'hot' | 'new' | 'top',
      page,
      limit,
      time as 'hour' | 'day' | 'week' | 'month' | 'year' | 'all' | undefined,
      userId
    );

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
});

// POST / - create post (expects community_id in body, community_name also accepted)
// Primary creation route is POST /communities/:name/posts (in communities.ts).
// This route supports direct creation with community_id in the request body.
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { community_name, community_id: bodyCommId } = req.body;

    let communityId = bodyCommId;
    if (!communityId && community_name) {
      const community = await communityService.getByName(community_name);
      if (!community) throw AppError.notFound('Community not found');
      communityId = community.id as string;
    }

    if (!communityId) {
      throw AppError.badRequest('community_name or community_id is required');
    }

    // Validate the post fields via schema
    const parseResult = createPostSchema.safeParse(req.body);
    if (!parseResult.success) {
      const details: Record<string, string[]> = {};
      for (const issue of parseResult.error.issues) {
        const path = issue.path.join('.');
        if (!details[path]) details[path] = [];
        details[path].push(issue.message);
      }
      throw AppError.badRequest('Validation failed', details);
    }

    const post = await postService.create(communityId, user.id, parseResult.data);

    const response: ApiResponse = {
      success: true,
      data: post,
    };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

// GET /:id - get post with top comments
router.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const userId = user?.id;

    const post = await postService.getById(req.params.id, userId);
    if (!post) {
      throw AppError.notFound('Post not found');
    }

    // Fetch top-level comments (first page, sorted by best)
    const commentSort = (req.query.comment_sort as string) || 'best';
    const validSorts = ['best', 'new', 'old'];
    const sort = validSorts.includes(commentSort) ? commentSort : 'best';

    const comments = await commentService.getCommentTree(
      req.params.id,
      sort as 'best' | 'new' | 'old',
      1,
      20,
      userId
    );

    const response: ApiResponse = {
      success: true,
      data: {
        post,
        comments: comments.data,
        comment_pagination: comments.pagination,
      },
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// PATCH /:id - edit post
router.patch('/:id', requireAuth, validate(updatePostSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const updated = await postService.update(req.params.id, user.id, req.body);

    if (!updated) {
      // Determine if it's not found or forbidden
      const existing = await db('posts').where({ id: req.params.id, is_deleted: false }).first();
      if (!existing) {
        throw AppError.notFound('Post not found');
      }
      throw AppError.forbidden('You can only edit your own posts');
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

// DELETE /:id - soft delete post
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const deleted = await postService.delete(req.params.id, user.id);

    if (!deleted) {
      const existing = await db('posts').where({ id: req.params.id }).first();
      if (!existing || existing.is_deleted) {
        throw AppError.notFound('Post not found');
      }
      throw AppError.forbidden('You can only delete your own posts');
    }

    const response: ApiResponse = {
      success: true,
      data: { message: 'Post deleted' },
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// POST /:id/vote - vote on post
router.post('/:id/vote', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { value } = req.body;

    if (value !== 1 && value !== -1 && value !== 0) {
      throw AppError.badRequest('Vote value must be 1, -1, or 0');
    }

    const result = await postService.voteOnPost(req.params.id, user.id, value);

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

// POST /:id/comments - create comment on a post
router.post('/:id/comments', requireAuth, validate(createCommentSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { body, parent_id } = req.body;

    const comment = await commentService.create(req.params.id, user.id, body, parent_id);

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

// GET /:id/comments - get comment tree for a post
router.get('/:id/comments', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const userId = user?.id;

    // Verify post exists
    const post = await db('posts').where({ id: req.params.id, is_deleted: false }).first();
    if (!post) {
      throw AppError.notFound('Post not found');
    }

    const sort = (req.query.sort as string) || 'best';
    if (!['best', 'new', 'old'].includes(sort)) {
      throw AppError.badRequest('Sort must be one of: best, new, old');
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));

    const result = await commentService.getCommentTree(
      req.params.id,
      sort as 'best' | 'new' | 'old',
      page,
      limit,
      userId
    );

    const response: ApiResponse = {
      success: true,
      data: result.data,
    };
    res.json({ ...response, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
});

export default router;
