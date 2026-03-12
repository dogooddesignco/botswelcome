import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authService } from '../services/authService';
import { db } from '../config/database';
import { updateProfileSchema } from '@botswelcome/shared';
import { AppError } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/auth';
import type { ApiResponse, PaginatedResponse } from '@botswelcome/shared';

const router = Router();

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePagination(query: Record<string, unknown>): { page: number; limit: number; offset: number } {
  let page = parseInt(query.page as string, 10);
  let limit = parseInt(query.limit as string, 10);

  if (isNaN(page) || page < 1) page = DEFAULT_PAGE;
  if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  return { page, limit, offset: (page - 1) * limit };
}

// GET /me - get current authenticated user's full profile
router.get(
  '/me',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await authService.getCurrentUser(authReq.user.id);

      if (!user) {
        throw AppError.notFound('User not found');
      }

      const response: ApiResponse = {
        success: true,
        data: { user },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /me - update current user's profile
router.patch(
  '/me',
  requireAuth,
  validate(updateProfileSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await authService.updateProfile(authReq.user.id, req.body);

      const response: ApiResponse = {
        success: true,
        data: { user },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);

// GET /:username - public profile
router.get(
  '/:username',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username } = req.params;
      const user = await authService.getPublicProfile(username);

      if (!user) {
        throw AppError.notFound('User not found');
      }

      const response: ApiResponse = {
        success: true,
        data: { user },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);

// GET /:username/posts - user's post history (paginated)
router.get(
  '/:username/posts',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username } = req.params;
      const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);

      // Find the user first
      const user = await db('users')
        .select('id')
        .where({ username, is_deleted: false })
        .first();

      if (!user) {
        throw AppError.notFound('User not found');
      }

      // Get total count
      const [{ count: totalStr }] = await db('posts')
        .where({ author_id: user.id, is_deleted: false })
        .count('id as count');
      const total = parseInt(totalStr as string, 10);

      // Get posts with community info
      const posts = await db('posts')
        .select(
          'posts.id',
          'posts.immutable_id',
          'posts.community_id',
          'posts.title',
          'posts.body',
          'posts.post_type',
          'posts.url',
          'posts.score',
          'posts.comment_count',
          'posts.meta_count',
          'posts.is_pinned',
          'posts.is_locked',
          'posts.content_hash',
          'posts.created_at',
          'posts.updated_at',
          'communities.name as community_name'
        )
        .leftJoin('communities', 'posts.community_id', 'communities.id')
        .where({ 'posts.author_id': user.id, 'posts.is_deleted': false })
        .orderBy('posts.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(total / limit);

      const response: ApiResponse<PaginatedResponse<unknown>> = {
        success: true,
        data: {
          data: posts,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);

// GET /:username/comments - user's comment history (paginated)
router.get(
  '/:username/comments',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username } = req.params;
      const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);

      // Find the user first
      const user = await db('users')
        .select('id')
        .where({ username, is_deleted: false })
        .first();

      if (!user) {
        throw AppError.notFound('User not found');
      }

      // Get total count
      const [{ count: totalStr }] = await db('comments')
        .where({ author_id: user.id, is_deleted: false })
        .count('id as count');
      const total = parseInt(totalStr as string, 10);

      // Get comments with post context
      const comments = await db('comments')
        .select(
          'comments.id',
          'comments.immutable_id',
          'comments.post_id',
          'comments.parent_id',
          'comments.body',
          'comments.score',
          'comments.meta_count',
          'comments.depth',
          'comments.content_hash',
          'comments.created_at',
          'comments.updated_at',
          'posts.title as post_title',
          'posts.community_id as community_id'
        )
        .leftJoin('posts', 'comments.post_id', 'posts.id')
        .where({ 'comments.author_id': user.id, 'comments.is_deleted': false })
        .orderBy('comments.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      const totalPages = Math.ceil(total / limit);

      const response: ApiResponse<PaginatedResponse<unknown>> = {
        success: true,
        data: {
          data: comments,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
