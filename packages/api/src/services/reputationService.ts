import { db } from '../config/database';
import { HashService } from './hashService';

export class ReputationService {
  async getAgentReputation(
    agentId: string,
    period: string = 'all'
  ): Promise<Record<string, unknown> | undefined> {
    const query = db('agent_reputation')
      .where({ agent_id: agentId })
      .orderBy('computed_at', 'desc');

    if (period !== 'all') {
      query.where({ period });
    }

    return query.first();
  }

  async getReputationHistory(
    agentId: string,
    limit: number = 30
  ): Promise<Record<string, unknown>[]> {
    return db('agent_reputation')
      .where({ agent_id: agentId })
      .orderBy('computed_at', 'desc')
      .limit(limit);
  }

  async getLeaderboard(
    sortBy: string = 'avg_score',
    page: number = 1,
    limit: number = 50,
    communityId?: string,
    period: string = 'all'
  ): Promise<{ data: Record<string, unknown>[]; total: number }> {
    const offset = (page - 1) * limit;

    // Validate sortBy to prevent injection
    const allowedSortColumns: Record<string, string> = {
      avg_score: 'agent_reputation.avg_score',
      total_posts: 'agent_reputation.total_posts',
      total_comments: 'agent_reputation.total_comments',
      meta_comment_count: 'agent_reputation.meta_comment_count',
      self_eval_count: 'agent_reputation.self_eval_count',
    };

    const sortColumn = allowedSortColumns[sortBy] ?? 'agent_reputation.avg_score';

    let baseQuery = db('agent_reputation')
      .join('agents', 'agents.id', 'agent_reputation.agent_id')
      .where('agents.is_active', true);

    if (period !== 'all') {
      baseQuery = baseQuery.where('agent_reputation.period', period);
    }

    if (communityId) {
      // Filter by agents scoped to this community or with no scope restriction
      baseQuery = baseQuery.where(function () {
        this.whereRaw('? = ANY(agents.scoped_communities)', [communityId])
          .orWhereRaw('agents.scoped_communities IS NULL')
          .orWhereRaw("agents.scoped_communities = '{}'");
      });
    }

    const countQuery = baseQuery.clone();
    const [{ count }] = await countQuery.count();

    const data = await baseQuery
      .select(
        'agent_reputation.*',
        'agents.agent_name',
        'agents.model_info',
        'agents.description',
        'agents.user_id'
      )
      .orderBy(sortColumn, 'desc')
      .limit(limit)
      .offset(offset);

    return { data, total: Number(count) };
  }

  async computeReputation(
    agentId: string,
    period: string = 'all'
  ): Promise<Record<string, unknown>> {
    const agent = await db('agents').where({ id: agentId }).first();
    if (!agent) {
      throw new ReputationServiceError(`Agent ${agentId} not found`, 'NOT_FOUND');
    }

    // Determine date range for period
    let dateFilter: Date | null = null;
    const now = new Date();

    switch (period) {
      case '7d':
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        dateFilter = null;
        break;
    }

    // Aggregate comment stats
    const commentsQuery = db('comments')
      .where({ author_id: agent.user_id, is_deleted: false });
    if (dateFilter) {
      commentsQuery.where('created_at', '>=', dateFilter);
    }
    const commentStats = await commentsQuery
      .select(
        db.raw('COUNT(*) as total_comments'),
        db.raw('COALESCE(AVG(score), 0) as avg_score')
      )
      .first();

    // Aggregate post stats
    const postsQuery = db('posts')
      .where({ author_id: agent.user_id, is_deleted: false });
    if (dateFilter) {
      postsQuery.where('created_at', '>=', dateFilter);
    }
    const postStats = await postsQuery.count().first();

    // Aggregate meta-comment stats
    const metaQuery = db('meta_comments')
      .where({ author_id: agent.user_id, is_deleted: false });
    if (dateFilter) {
      metaQuery.where('created_at', '>=', dateFilter);
    }
    const metaStats = await metaQuery.count().first();

    // Self-eval count
    const selfEvalQuery = db('meta_comments')
      .where({ author_id: agent.user_id, is_self_eval: true, is_deleted: false });
    if (dateFilter) {
      selfEvalQuery.where('created_at', '>=', dateFilter);
    }
    const selfEvalStats = await selfEvalQuery.count().first();

    // Aggregate reactions on agent's comments
    const reactionQuery = db('reactions')
      .join('comments', 'comments.id', 'reactions.comment_id')
      .where('comments.author_id', agent.user_id);
    if (dateFilter) {
      reactionQuery.where('reactions.created_at', '>=', dateFilter);
    }
    const reactionRows = await reactionQuery
      .groupBy('reactions.reaction_type')
      .select('reactions.reaction_type', db.raw('COUNT(*) as count'));

    const totalReactions: Record<string, number> = {};
    for (const row of reactionRows) {
      totalReactions[row.reaction_type] = Number(row.count);
    }

    const totalPosts = Number(postStats?.count ?? 0);
    const totalComments = Number(commentStats?.total_comments ?? 0);
    const avgScore = Number(commentStats?.avg_score ?? 0);
    const metaCommentCount = Number(metaStats?.count ?? 0);
    const selfEvalCount = Number(selfEvalStats?.count ?? 0);

    // Compute content hash for integrity/future blockchain anchoring
    const contentForHash = JSON.stringify({
      agent_id: agentId,
      period,
      total_posts: totalPosts,
      total_comments: totalComments,
      total_reactions: totalReactions,
      avg_score: avgScore,
      meta_comment_count: metaCommentCount,
      self_eval_count: selfEvalCount,
    });
    const contentHash = HashService.sha256(contentForHash);

    // Upsert into agent_reputation
    const [reputation] = await db('agent_reputation')
      .insert({
        agent_id: agentId,
        period,
        total_posts: totalPosts,
        total_comments: totalComments,
        total_reactions: JSON.stringify(totalReactions),
        avg_score: avgScore,
        meta_comment_count: metaCommentCount,
        self_eval_count: selfEvalCount,
        content_hash: contentHash,
        computed_at: db.fn.now(),
      })
      .onConflict(['agent_id', 'period'])
      .merge({
        total_posts: totalPosts,
        total_comments: totalComments,
        total_reactions: JSON.stringify(totalReactions),
        avg_score: avgScore,
        meta_comment_count: metaCommentCount,
        self_eval_count: selfEvalCount,
        content_hash: contentHash,
        computed_at: db.fn.now(),
      })
      .returning('*');

    return reputation;
  }
}

export class ReputationServiceError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    Object.setPrototypeOf(this, ReputationServiceError.prototype);
  }
}

export const reputationService = new ReputationService();
