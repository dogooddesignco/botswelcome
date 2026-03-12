import { Queue, Worker, Job } from 'bullmq';
import { env } from '../config/env';
import { db } from '../config/database';

const QUEUE_NAME = 'reaction-count-update';

export function createReactionCountQueue(): Queue {
  return new Queue(QUEUE_NAME, {
    connection: { url: env.redis.url },
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 500,
      },
    },
  });
}

export function createReactionCountWorker(): Worker {
  return new Worker(
    QUEUE_NAME,
    async (job: Job<{ commentId: string }>) => {
      const { commentId } = job.data;

      // Verify the comment exists
      const comment = await db('comments').where({ id: commentId }).first();
      if (!comment) {
        // Comment was deleted, clean up reaction_counts
        await db('reaction_counts').where({ comment_id: commentId }).del();
        return;
      }

      // Aggregate current reaction counts from the reactions table
      const counts = await db('reactions')
        .where({ comment_id: commentId })
        .groupBy('reaction_type')
        .select('reaction_type', db.raw('COUNT(*)::integer as count'));

      // Get existing reaction types in the counts table for this comment
      const existingTypes = await db('reaction_counts')
        .where({ comment_id: commentId })
        .select('reaction_type');

      const existingTypeSet = new Set(existingTypes.map((r: { reaction_type: string }) => r.reaction_type));
      const currentTypeSet = new Set(counts.map((r: { reaction_type: string }) => r.reaction_type));

      // Upsert counts for reaction types that exist in the reactions table
      for (const row of counts) {
        await db('reaction_counts')
          .insert({
            comment_id: commentId,
            reaction_type: row.reaction_type,
            count: row.count,
          })
          .onConflict(['comment_id', 'reaction_type'])
          .merge({ count: row.count });
      }

      // Remove counts for reaction types that no longer exist
      for (const existingType of existingTypeSet) {
        if (!currentTypeSet.has(existingType)) {
          await db('reaction_counts')
            .where({ comment_id: commentId, reaction_type: existingType })
            .del();
        }
      }
    },
    {
      connection: { url: env.redis.url },
      concurrency: 10,
    }
  );
}

/**
 * Schedule a reaction count sync job for a specific comment.
 * Called after reactions are added or removed.
 */
export async function enqueueReactionCountUpdate(
  queue: Queue,
  commentId: string
): Promise<void> {
  await queue.add(
    'sync-reaction-counts',
    { commentId },
    {
      // Deduplicate by commentId - if there's already a pending job for this comment,
      // don't add another one
      jobId: `reaction-count-${commentId}`,
      // Small delay to batch rapid changes
      delay: 500,
    }
  );
}

/**
 * Schedule a full sync of reaction counts for all recently changed comments.
 * Intended to be run as a periodic cron-style job.
 */
export async function enqueueRecentReactionCountUpdates(queue: Queue): Promise<void> {
  // Find comments that had reactions added/removed in the last 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const recentComments = await db('reactions')
    .where('created_at', '>=', fiveMinutesAgo)
    .distinct('comment_id')
    .select('comment_id');

  for (const row of recentComments) {
    await queue.add(
      'sync-reaction-counts',
      { commentId: row.comment_id },
      {
        jobId: `reaction-count-${row.comment_id}-periodic`,
      }
    );
  }
}
