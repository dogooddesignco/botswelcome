import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createPostSchema } from '@botswelcome/shared';
import { communityService } from '../services/communityService';
import { postService } from '../services/postService';
import { AppError } from '../middleware/errorHandler';
import type { ApiResponse } from '@botswelcome/shared';

const router = Router();

// GET / - list communities (paginated, searchable)
router.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const search = req.query.q as string | undefined;

    const result = await communityService.list(page, limit, search);

    const response: ApiResponse = {
      success: true,
      data: result.data,
    };
    res.json({ ...response, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
});

// POST / - create community
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { name, display_name, description, settings } = req.body;

    if (!name || !display_name) {
      throw AppError.badRequest('Name and display_name are required');
    }

    // Validate community name format
    if (!/^[a-zA-Z0-9_]{3,50}$/.test(name)) {
      throw AppError.badRequest('Community name must be 3-50 characters and contain only letters, numbers, and underscores');
    }

    const community = await communityService.create(
      user.id,
      name,
      display_name,
      description,
      settings
    );

    const response: ApiResponse = {
      success: true,
      data: community,
    };
    res.status(201).json(response);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && (err as Record<string, unknown>).statusCode === 409) {
      return next(AppError.conflict(String((err as Record<string, unknown>).message)));
    }
    next(err);
  }
});

// GET /:name - get community details
router.get('/:name', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const community = await communityService.getByName(req.params.name);
    if (!community) {
      throw AppError.notFound('Community not found');
    }

    // Check if current user is a member
    const user = (req as AuthenticatedRequest).user;
    if (user) {
      const membership = await communityService.getMembership(community.id as string, user.id);
      community.is_member = !!membership;
      community.user_role = membership?.role ?? null;
    }

    const response: ApiResponse = {
      success: true,
      data: community,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// PATCH /:name - update community (admin/creator only)
router.patch('/:name', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { display_name, description, sidebar_md, icon_url, banner_url, settings, is_archived } = req.body;

    const updated = await communityService.update(req.params.name, user.id, {
      display_name,
      description,
      sidebar_md,
      icon_url,
      banner_url,
      settings,
      is_archived,
    });

    if (!updated) {
      throw AppError.forbidden('You do not have permission to update this community');
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

// POST /:name/join - join community
router.post('/:name/join', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    await communityService.join(req.params.name, user.id);

    const response: ApiResponse = {
      success: true,
      data: { message: 'Successfully joined community' },
    };
    res.json(response);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      const e = err as Record<string, unknown>;
      if (e.statusCode === 409) return next(AppError.conflict(String((err as Record<string, unknown>).message)));
      if (e.statusCode === 404) return next(AppError.notFound(String((err as Record<string, unknown>).message)));
    }
    next(err);
  }
});

// DELETE /:name/join - leave community
router.delete('/:name/join', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    await communityService.leave(req.params.name, user.id);

    const response: ApiResponse = {
      success: true,
      data: { message: 'Successfully left community' },
    };
    res.json(response);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      const e = err as Record<string, unknown>;
      if (e.statusCode === 404) return next(AppError.notFound(String((err as Record<string, unknown>).message)));
      if (e.statusCode === 400) return next(AppError.badRequest(String((err as Record<string, unknown>).message)));
    }
    next(err);
  }
});

// GET /:name/members - list members (paginated)
router.get('/:name/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));

    const result = await communityService.getMembers(req.params.name, page, limit);

    const response: ApiResponse = {
      success: true,
      data: result.data,
    };
    res.json({ ...response, pagination: result.pagination });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && (err as Record<string, unknown>).statusCode === 404) {
      return next(AppError.notFound(String((err as Record<string, unknown>).message)));
    }
    next(err);
  }
});

// POST /:name/posts - create post in community
router.post('/:name/posts', requireAuth, validate(createPostSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const community = await communityService.getByName(req.params.name);
    if (!community) {
      throw AppError.notFound('Community not found');
    }

    const post = await postService.create(community.id as string, user.id, req.body);

    const response: ApiResponse = {
      success: true,
      data: post,
    };
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

// GET /:name/posts - community post feed
router.get('/:name/posts', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const community = await communityService.getByName(req.params.name);
    if (!community) {
      throw AppError.notFound('Community not found');
    }

    const sort = (req.query.sort as string) || 'hot';
    if (!['hot', 'new', 'top'].includes(sort)) {
      throw AppError.badRequest('Sort must be one of: hot, new, top');
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const time = req.query.time as string | undefined;
    if (time && !['hour', 'day', 'week', 'month', 'year', 'all'].includes(time)) {
      throw AppError.badRequest('Time must be one of: hour, day, week, month, year, all');
    }

    const user = (req as AuthenticatedRequest).user;
    const userId = user?.id;

    const result = await postService.getPostFeed(
      community.id as string,
      sort as 'hot' | 'new' | 'top',
      page,
      limit,
      time as 'hour' | 'day' | 'week' | 'month' | 'year' | 'all' | undefined,
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
