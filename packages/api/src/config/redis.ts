import Redis from 'ioredis';
import { env } from './env';

let redis: Redis | null = null;
let redisAvailable = true;

export function getRedis(): Redis | null {
  if (!redisAvailable) return null;

  if (!redis) {
    try {
      redis = new Redis(env.redis.url, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
        retryStrategy(times: number) {
          if (times > 3) {
            redisAvailable = false;
            console.warn('[redis] Connection failed after 3 retries, disabling Redis features');
            return null;
          }
          return Math.min(times * 200, 2000);
        },
      });

      redis.on('error', () => {
        // Silently handle connection errors — rate limiting will be skipped
      });

      redis.connect().catch(() => {
        redisAvailable = false;
        redis = null;
        console.warn('[redis] Not available, rate limiting disabled');
      });
    } catch {
      redisAvailable = false;
      return null;
    }
  }
  return redis;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

export default getRedis;
