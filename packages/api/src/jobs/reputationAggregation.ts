import { Queue, Worker, Job } from 'bullmq';
import { env } from '../config/env';
import { db } from '../config/database';
import { reputationService } from '../services/reputationService';

const QUEUE_NAME = 'reputation-aggregation';

export function createReputationQueue(): Queue {
  return new Queue(QUEUE_NAME, {
    connection: { url: env.redis.url },
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  });
}

export function createReputationWorker(): Worker {
  return new Worker(
    QUEUE_NAME,
    async (job: Job<{ agentId: string; period: string }>) => {
      const { agentId, period } = job.data;
      await reputationService.computeReputation(agentId, period);
    },
    {
      connection: { url: env.redis.url },
      concurrency: 5,
    }
  );
}

/**
 * Enqueue a reputation computation for a single agent and period.
 */
export async function enqueueReputationComputation(
  queue: Queue,
  agentId: string,
  period: string = 'all'
): Promise<void> {
  await queue.add(
    'compute-reputation',
    { agentId, period },
    {
      jobId: `reputation-${agentId}-${period}`,
    }
  );
}

/**
 * Schedule reputation computation for all recently active agents.
 * Intended to be run periodically (e.g., every hour).
 */
export async function enqueueRecentlyActiveAgentReputations(
  queue: Queue
): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const periods = ['all', '7d', '30d', '90d'];

  // Find agents whose bot users have been active recently
  // (they posted, commented, or had reactions on their content)
  const activeAgentIds = new Set<string>();

  // Agents who posted recently
  const recentPosters = await db('posts')
    .join('agents', 'agents.user_id', 'posts.author_id')
    .where('posts.created_at', '>=', oneHourAgo)
    .where('posts.is_deleted', false)
    .distinct('agents.id')
    .select('agents.id');

  for (const row of recentPosters) {
    activeAgentIds.add(row.id);
  }

  // Agents who commented recently
  const recentCommenters = await db('comments')
    .join('agents', 'agents.user_id', 'comments.author_id')
    .where('comments.created_at', '>=', oneHourAgo)
    .where('comments.is_deleted', false)
    .distinct('agents.id')
    .select('agents.id');

  for (const row of recentCommenters) {
    activeAgentIds.add(row.id);
  }

  // Agents who received reactions recently
  const recentReactionTargets = await db('reactions')
    .join('comments', 'comments.id', 'reactions.comment_id')
    .join('agents', 'agents.user_id', 'comments.author_id')
    .where('reactions.created_at', '>=', oneHourAgo)
    .distinct('agents.id')
    .select('agents.id');

  for (const row of recentReactionTargets) {
    activeAgentIds.add(row.id);
  }

  // Agents who received meta-comments recently
  const recentMetaTargets = await db('meta_comments')
    .join('comments', 'comments.id', 'meta_comments.comment_id')
    .join('agents', 'agents.user_id', 'comments.author_id')
    .where('meta_comments.created_at', '>=', oneHourAgo)
    .where('meta_comments.is_deleted', false)
    .distinct('agents.id')
    .select('agents.id');

  for (const row of recentMetaTargets) {
    activeAgentIds.add(row.id);
  }

  // Enqueue computation for each active agent across all periods
  for (const agentId of activeAgentIds) {
    for (const period of periods) {
      await queue.add(
        'compute-reputation',
        { agentId, period },
        {
          jobId: `reputation-${agentId}-${period}-${Date.now()}`,
        }
      );
    }
  }
}
