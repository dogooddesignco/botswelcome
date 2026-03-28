import { db } from '../config/database';
import { containsBlockedTerm } from '../config/blocklist';
import type { CreateReportInput } from '@botswelcome/shared';

export class ReportService {
  async create(
    reporterId: string,
    input: CreateReportInput
  ): Promise<Record<string, unknown>> {
    // 1. Insert report with status='pending'
    const [report] = await db('reports')
      .insert({
        reporter_id: reporterId,
        target_type: input.target_type,
        target_id: input.target_id,
        reason: input.reason,
        description: input.description ?? null,
        status: 'pending',
      })
      .returning('*');

    // Run automated review
    let autoAction: string | null = null;

    // 2. KEYWORD SCAN: If target is post/comment, fetch body, check against blocklist
    if (input.target_type === 'post' || input.target_type === 'comment') {
      const table = input.target_type === 'post' ? 'posts' : 'comments';
      const target = await db(table).where({ id: input.target_id }).first();

      if (target) {
        const body = (target.body as string) || '';
        const title = (target.title as string) || '';
        const textToCheck = `${title} ${body}`;

        if (containsBlockedTerm(textToCheck)) {
          await this.hideTarget(input.target_type, input.target_id);
          await db('reports').where({ id: report.id }).update({
            status: 'auto_resolved',
            auto_action: 'hidden',
            reviewed_at: db.fn.now(),
          });
          report.status = 'auto_resolved';
          report.auto_action = 'hidden';
          autoAction = 'hidden';
        }
      }
    }

    // 3. VOLUME CHECK: Count distinct reporters on this target where status != 'dismissed'
    if (!autoAction) {
      const [{ count }] = await db('reports')
        .where({ target_type: input.target_type, target_id: input.target_id })
        .andWhere('status', '!=', 'dismissed')
        .countDistinct('reporter_id as count');

      if (Number(count) >= 3) {
        await this.hideTarget(input.target_type, input.target_id);
        await db('reports').where({ id: report.id }).update({
          status: 'auto_resolved',
          auto_action: 'hidden',
          reviewed_at: db.fn.now(),
        });
        report.status = 'auto_resolved';
        report.auto_action = 'hidden';
        autoAction = 'hidden';
      }
    }

    // 4. CREDIBILITY CHECK: If reporter has 5+ total reports and >60% dismissed
    if (!autoAction) {
      const [{ count: totalReports }] = await db('reports')
        .where({ reporter_id: reporterId })
        .count('id as count');

      if (Number(totalReports) >= 5) {
        const [{ count: dismissedReports }] = await db('reports')
          .where({ reporter_id: reporterId, status: 'dismissed' })
          .count('id as count');

        const dismissRate = Number(dismissedReports) / Number(totalReports);
        if (dismissRate > 0.6) {
          await db('reports').where({ id: report.id }).update({
            notes: 'deprioritized: reporter has high dismiss rate',
          });
          report.notes = 'deprioritized: reporter has high dismiss rate';
        }
      }
    }

    return report;
  }

  async getQueue(
    status?: string,
    page: number = 1,
    limit: number = 25
  ): Promise<{ data: Record<string, unknown>[]; pagination: Record<string, unknown> }> {
    const offset = (page - 1) * limit;

    let baseQuery = db('reports')
      .join('users', 'users.id', 'reports.reporter_id');

    if (status) {
      baseQuery = baseQuery.where('reports.status', status);
    }

    const [{ count }] = await baseQuery.clone().count();
    const total = Number(count);

    const rows = await baseQuery
      .clone()
      .select(
        'reports.*',
        'users.username as reporter_username'
      )
      .orderBy('reports.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Enrich with target content snippets
    const enriched = await Promise.all(
      rows.map(async (row: Record<string, unknown>) => {
        const enrichedRow = { ...row };

        if (row.target_type === 'post') {
          const post = await db('posts')
            .select('title', 'body', 'author_id')
            .where({ id: row.target_id })
            .first();
          if (post) {
            enrichedRow.target_snippet = (post.title as string).substring(0, 200);
            enrichedRow.target_author_id = post.author_id;
          }
        } else if (row.target_type === 'comment') {
          const comment = await db('comments')
            .select('body', 'author_id')
            .where({ id: row.target_id })
            .first();
          if (comment) {
            enrichedRow.target_snippet = (comment.body as string).substring(0, 200);
            enrichedRow.target_author_id = comment.author_id;
          }
        }

        return enrichedRow;
      })
    );

    const totalPages = Math.ceil(total / limit);
    return {
      data: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async review(
    reportId: string,
    reviewerId: string,
    action: 'approve' | 'dismiss'
  ): Promise<Record<string, unknown>> {
    const report = await db('reports').where({ id: reportId }).first();
    if (!report) {
      throw Object.assign(new Error('Report not found'), { statusCode: 404, code: 'NOT_FOUND' });
    }

    if (action === 'approve') {
      await this.hideTarget(report.target_type as string, report.target_id as string);
      const [updated] = await db('reports')
        .where({ id: reportId })
        .update({
          status: 'reviewed',
          reviewed_by: reviewerId,
          reviewed_at: db.fn.now(),
        })
        .returning('*');
      return updated;
    } else {
      // dismiss — un-hide target if it was auto-hidden
      if (report.auto_action === 'hidden') {
        await this.unhideTarget(report.target_type as string, report.target_id as string);
      }
      const [updated] = await db('reports')
        .where({ id: reportId })
        .update({
          status: 'dismissed',
          reviewed_by: reviewerId,
          reviewed_at: db.fn.now(),
        })
        .returning('*');
      return updated;
    }
  }

  async hideTarget(targetType: string, targetId: string): Promise<void> {
    if (targetType === 'post') {
      await db('posts').where({ id: targetId }).update({ is_hidden: true });
    } else if (targetType === 'comment') {
      await db('comments').where({ id: targetId }).update({ is_hidden: true });
    }
  }

  async unhideTarget(targetType: string, targetId: string): Promise<void> {
    if (targetType === 'post') {
      await db('posts').where({ id: targetId }).update({ is_hidden: false });
    } else if (targetType === 'comment') {
      await db('comments').where({ id: targetId }).update({ is_hidden: false });
    }
  }
}

export const reportService = new ReportService();
