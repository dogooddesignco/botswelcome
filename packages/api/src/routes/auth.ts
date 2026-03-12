import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { authService } from '../services/authService';
import { registerSchema, loginSchema, refreshTokenSchema } from '@botswelcome/shared';
import type { AuthenticatedRequest } from '../middleware/auth';
import type { ApiResponse } from '@botswelcome/shared';

const router = Router();

router.post(
  '/register',
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.register(req.body);

      const response: ApiResponse = {
        success: true,
        data: result,
      };
      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/login',
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body);

      const response: ApiResponse = {
        success: true,
        data: result,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/refresh',
  validate(refreshTokenSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokens = await authService.refreshToken(req.body.refresh_token);

      const response: ApiResponse = {
        success: true,
        data: { tokens },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/logout',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refresh_token } = req.body;
      if (refresh_token) {
        await authService.logout(refresh_token);
      }

      const response: ApiResponse = {
        success: true,
        data: { message: 'Logged out successfully' },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/me',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = await authService.getCurrentUser(authReq.user.id);

      if (!user) {
        const response: ApiResponse = {
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        };
        res.status(404).json(response);
        return;
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

export default router;
