import { Request, Response, NextFunction } from 'express';
import { getRedis } from '../config/redis';
import { AppError } from './errorHandler';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix?: string;
}

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, keyPrefix = 'rl' } = options;
  const windowSec = Math.ceil(windowMs / 1000);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const redis = getRedis();
      const identifier = (req.user as { id?: string })?.id ?? req.ip ?? 'unknown';
      const key = `${keyPrefix}:${identifier}`;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Use sliding window with sorted sets for more accurate rate limiting
      // Remove entries outside the current window
      await redis.zremrangebyscore(key, '-inf', windowStart);

      // Count entries in current window
      const currentCount = await redis.zcard(key);

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - currentCount));

      if (currentCount >= max) {
        // Calculate Retry-After from oldest entry
        const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
        let retryAfter = windowSec;
        if (oldest.length >= 2) {
          const oldestTimestamp = Number(oldest[1]);
          retryAfter = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
          if (retryAfter < 1) retryAfter = 1;
        }

        res.setHeader('Retry-After', retryAfter);
        next(AppError.tooManyRequests(`Rate limit exceeded. Try again in ${retryAfter} seconds.`));
        return;
      }

      // Add current request
      await redis.zadd(key, now, `${now}:${Math.random()}`);
      await redis.expire(key, windowSec + 1);

      next();
    } catch {
      // If Redis is down, allow the request through
      next();
    }
  };
}
