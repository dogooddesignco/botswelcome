import { Request, Response, NextFunction } from 'express';
import { passport } from '../config/auth';
import { AppError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    username: string;
    email: string;
    is_bot: boolean;
    is_admin: boolean;
    verification_tier: number;
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  passport.authenticate(
    'jwt',
    { session: false },
    (err: Error | null, user: AuthenticatedRequest['user'] | false) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return next(AppError.unauthorized('Authentication required'));
      }
      req.user = user;
      next();
    }
  )(req, res, next);
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  const user = (req as AuthenticatedRequest).user;
  if (!user || !user.is_admin) {
    return next(AppError.forbidden('Admin access required'));
  }
  next();
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  // If no auth header is present, skip authentication entirely
  if (!authHeader) {
    next();
    return;
  }

  passport.authenticate(
    'jwt',
    { session: false },
    (err: Error | null, user: AuthenticatedRequest['user'] | false) => {
      if (err) {
        return next(err);
      }
      if (user) {
        req.user = user;
      }
      next();
    }
  )(req, res, next);
}
