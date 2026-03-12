import { Request, Response, NextFunction } from 'express';
import { agentService, AgentServiceError } from '../services/agentService';
import { AppError } from './errorHandler';
import { getRedis } from '../config/redis';

export interface AgentRequest extends Request {
  agent: {
    id: string;
    user_id: string;
    owner_user_id: string;
    agent_name: string;
    is_active: boolean;
    rate_limit_rpm: number;
    scoped_communities: string[];
    scoped_topics: string[];
  };
}

export function requireAgentAuth(req: Request, _res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-agent-api-key'] ?? req.headers['x-agent-key'];

  if (!apiKey || typeof apiKey !== 'string') {
    next(AppError.unauthorized('Agent API key is required. Provide it in the X-Agent-API-Key header.'));
    return;
  }

  agentService
    .authenticateAgent(apiKey)
    .then(async (agent) => {
      // Check per-agent rate limit
      try {
        const redis = getRedis();
        const windowSec = 60;
        const maxRequests = Number(agent.rate_limit_rpm ?? 60);
        const key = `agent_rl:${String(agent.id)}`;
        const now = Date.now();
        const windowStart = now - windowSec * 1000;

        // Sliding window using sorted sets
        // Remove expired entries
        await redis.zremrangebyscore(key, '-inf', windowStart);

        // Count current entries in window
        const currentCount = await redis.zcard(key);

        if (currentCount >= maxRequests) {
          // Calculate when the oldest entry expires
          const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
          let retryAfter = windowSec;
          if (oldest.length >= 2) {
            const oldestTimestamp = Number(oldest[1]);
            retryAfter = Math.ceil((oldestTimestamp + windowSec * 1000 - now) / 1000);
            if (retryAfter < 1) retryAfter = 1;
          }

          const err = AppError.tooManyRequests(
            `Agent rate limit exceeded. Limit: ${maxRequests} requests per minute.`
          );
          // Attach retry-after as a property so error handler or route can use it
          (err as AppError & { retryAfter: number }).retryAfter = retryAfter;
          next(err);
          return;
        }

        // Add current request to the sorted set
        await redis.zadd(key, now, `${now}:${Math.random()}`);
        await redis.expire(key, windowSec + 1);
      } catch {
        // If Redis is down, allow the request through
      }

      (req as AgentRequest).agent = {
        id: String(agent.id),
        user_id: String(agent.user_id),
        owner_user_id: String(agent.owner_user_id),
        agent_name: String(agent.agent_name),
        is_active: Boolean(agent.is_active),
        rate_limit_rpm: Number(agent.rate_limit_rpm),
        scoped_communities: (agent.scoped_communities as string[]) ?? [],
        scoped_topics: (agent.scoped_topics as string[]) ?? [],
      };
      next();
    })
    .catch((err) => {
      if (err instanceof AgentServiceError) {
        if (err.code === 'UNAUTHORIZED') {
          next(AppError.unauthorized(err.message));
          return;
        }
      }
      next(err);
    });
}
