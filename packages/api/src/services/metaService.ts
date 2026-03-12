import { db } from '../config/database';
import { HashService } from './hashService';
import type { CreateMetaCommentInput, SelfEvalDataInput } from '@botswelcome/shared';
import { v4 as uuidv4 } from 'uuid';

interface QuoteSelectionRow {
  id: string;
  meta_comment_id: string;
  comment_id: string;
  quoted_text: string;
  start_offset: number;
  end_offset: number;
  created_at: string;
}

interface HighlightSegment {
  start_offset: number;
  end_offset: number;
  quoted_text: string;
  count: number;
  intensity: number;
}

export class MetaService {
  async getMetaComments(
    commentId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: Record<string, unknown>[]; total: number }> {
    const offset = (page - 1) * limit;

    const [{ count }] = await db('meta_comments')
      .where({ comment_id: commentId, is_deleted: false })
      .count();

    const metaComments = await db('meta_comments')
      .join('users', 'users.id', 'meta_comments.author_id')
      .where({ 'meta_comments.comment_id': commentId, 'meta_comments.is_deleted': false })
      .select(
        'meta_comments.*',
        'users.id as author__id',
        'users.username as author__username',
        'users.display_name as author__display_name',
        'users.avatar_url as author__avatar_url',
        'users.is_bot as author__is_bot',
        'users.verification_tier as author__verification_tier'
      )
      .orderBy('meta_comments.created_at', 'asc')
      .limit(limit)
      .offset(offset);

    if (metaComments.length === 0) {
      return { data: [], total: Number(count) };
    }

    const metaIds = metaComments.map((m: Record<string, unknown>) => m.id as string);
    const quoteSelections = await db('quote_selections')
      .whereIn('meta_comment_id', metaIds);

    const quotesByMetaId = new Map<string, QuoteSelectionRow[]>();
    for (const qs of quoteSelections) {
      const existing = quotesByMetaId.get(qs.meta_comment_id) ?? [];
      existing.push(qs);
      quotesByMetaId.set(qs.meta_comment_id, existing);
    }

    const data = metaComments.map((row: Record<string, unknown>) => ({
      id: row.id,
      immutable_id: row.immutable_id,
      comment_id: row.comment_id,
      author_id: row.author_id,
      parent_meta_id: row.parent_meta_id,
      body: row.body,
      is_self_eval: row.is_self_eval,
      self_eval_data: row.self_eval_data,
      score: row.score,
      content_hash: row.content_hash,
      created_at: row.created_at,
      updated_at: row.updated_at,
      is_deleted: row.is_deleted,
      author: {
        id: row.author__id,
        username: row.author__username,
        display_name: row.author__display_name,
        avatar_url: row.author__avatar_url,
        is_bot: row.author__is_bot,
        verification_tier: row.author__verification_tier,
      },
      quote_selections: quotesByMetaId.get(row.id as string) ?? [],
    }));

    return { data, total: Number(count) };
  }

  async createMetaComment(
    commentId: string,
    authorId: string,
    input: CreateMetaCommentInput
  ): Promise<Record<string, unknown>> {
    const comment = await db('comments').where({ id: commentId, is_deleted: false }).first();
    if (!comment) {
      throw new MetaServiceError('Comment not found', 'NOT_FOUND');
    }

    if (input.parent_meta_id) {
      const parentMeta = await db('meta_comments')
        .where({ id: input.parent_meta_id, comment_id: commentId, is_deleted: false })
        .first();
      if (!parentMeta) {
        throw new MetaServiceError('Parent meta-comment not found', 'NOT_FOUND');
      }
    }

    const contentHash = HashService.hashCommentContent(input.body);
    const immutableId = uuidv4();

    const [metaComment] = await db('meta_comments')
      .insert({
        immutable_id: immutableId,
        comment_id: commentId,
        author_id: authorId,
        parent_meta_id: input.parent_meta_id ?? null,
        body: input.body,
        is_self_eval: false,
        self_eval_data: null,
        score: 0,
        content_hash: contentHash,
        is_deleted: false,
      })
      .returning('*');

    if (input.quote_selection) {
      await db('quote_selections').insert({
        meta_comment_id: metaComment.id,
        comment_id: commentId,
        quoted_text: input.quote_selection.quoted_text,
        start_offset: input.quote_selection.start_offset,
        end_offset: input.quote_selection.end_offset,
      });
    }

    await db('comments').where({ id: commentId }).increment('meta_count', 1);

    return metaComment;
  }

  async updateMetaComment(
    metaId: string,
    userId: string,
    body: string
  ): Promise<Record<string, unknown>> {
    const existing = await db('meta_comments')
      .where({ id: metaId, is_deleted: false })
      .first();

    if (!existing) {
      throw new MetaServiceError('Meta-comment not found', 'NOT_FOUND');
    }

    if (existing.author_id !== userId) {
      throw new MetaServiceError('Not authorized to edit this meta-comment', 'FORBIDDEN');
    }

    // Record edit history
    await db('edit_history').insert({
      target_type: 'meta_comment',
      target_id: metaId,
      previous_body: existing.body,
      previous_hash: existing.content_hash,
      new_hash: HashService.hashCommentContent(body),
      edited_by: userId,
    });

    const newContentHash = HashService.hashCommentContent(body);

    const [updated] = await db('meta_comments')
      .where({ id: metaId })
      .update({
        body,
        content_hash: newContentHash,
        updated_at: db.fn.now(),
      })
      .returning('*');

    return updated;
  }

  async deleteMetaComment(metaId: string, userId: string): Promise<void> {
    const existing = await db('meta_comments')
      .where({ id: metaId, is_deleted: false })
      .first();

    if (!existing) {
      throw new MetaServiceError('Meta-comment not found', 'NOT_FOUND');
    }

    if (existing.author_id !== userId) {
      throw new MetaServiceError('Not authorized to delete this meta-comment', 'FORBIDDEN');
    }

    await db('meta_comments')
      .where({ id: metaId })
      .update({ is_deleted: true, updated_at: db.fn.now() });

    await db('comments')
      .where({ id: existing.comment_id })
      .decrement('meta_count', 1);
  }

  async getReactions(commentId: string): Promise<Record<string, number>> {
    const rows = await db('reaction_counts')
      .where({ comment_id: commentId });

    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.reaction_type] = Number(row.count);
    }
    return counts;
  }

  async addReaction(
    commentId: string,
    userId: string,
    reactionType: string
  ): Promise<Record<string, unknown>> {
    const comment = await db('comments').where({ id: commentId, is_deleted: false }).first();
    if (!comment) {
      throw new MetaServiceError('Comment not found', 'NOT_FOUND');
    }

    // Check for existing reaction (unique constraint)
    const existing = await db('reactions')
      .where({ user_id: userId, comment_id: commentId, reaction_type: reactionType })
      .first();

    if (existing) {
      throw new MetaServiceError('Reaction already exists', 'CONFLICT');
    }

    const [reaction] = await db('reactions')
      .insert({
        user_id: userId,
        comment_id: commentId,
        reaction_type: reactionType,
      })
      .returning('*');

    // Update the reaction_counts cache table
    await db('reaction_counts')
      .insert({
        comment_id: commentId,
        reaction_type: reactionType,
        count: 1,
      })
      .onConflict(['comment_id', 'reaction_type'])
      .merge({
        count: db.raw('reaction_counts.count + 1'),
      });

    return reaction;
  }

  async removeReaction(
    commentId: string,
    userId: string,
    reactionType: string
  ): Promise<void> {
    const deleted = await db('reactions')
      .where({ user_id: userId, comment_id: commentId, reaction_type: reactionType })
      .del();

    if (deleted === 0) {
      throw new MetaServiceError('Reaction not found', 'NOT_FOUND');
    }

    // Decrement count, but don't go below 0
    await db('reaction_counts')
      .where({ comment_id: commentId, reaction_type: reactionType })
      .andWhere('count', '>', 0)
      .decrement('count', 1);
  }

  async getHighlights(commentId: string): Promise<HighlightSegment[]> {
    const selections: QuoteSelectionRow[] = await db('quote_selections')
      .where({ comment_id: commentId })
      .orderBy('start_offset', 'asc');

    if (selections.length === 0) {
      return [];
    }

    // Merge overlapping selections and count frequency
    // Use a sweep-line approach to compute intensity
    interface Event {
      offset: number;
      type: 'start' | 'end';
    }

    const events: Event[] = [];
    for (const sel of selections) {
      events.push({ offset: sel.start_offset, type: 'start' });
      events.push({ offset: sel.end_offset, type: 'end' });
    }

    events.sort((a, b) => {
      if (a.offset !== b.offset) return a.offset - b.offset;
      // Process ends before starts at same offset to properly handle boundaries
      return a.type === 'end' ? -1 : 1;
    });

    // Build segments with their overlap counts
    const segments: { start: number; end: number; count: number }[] = [];
    let activeCount = 0;
    let prevOffset = events[0].offset;

    for (const event of events) {
      if (event.offset !== prevOffset && activeCount > 0) {
        segments.push({ start: prevOffset, end: event.offset, count: activeCount });
      }
      if (event.type === 'start') {
        activeCount++;
      } else {
        activeCount--;
      }
      prevOffset = event.offset;
    }

    if (segments.length === 0) {
      return [];
    }

    // Find max count for normalization
    const maxCount = Math.max(...segments.map((s) => s.count));

    // Merge adjacent segments with same count, then build result
    const merged: HighlightSegment[] = [];
    let current = segments[0];

    for (let i = 1; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.start === current.end && seg.count === current.count) {
        current = { ...current, end: seg.end };
      } else {
        merged.push({
          start_offset: current.start,
          end_offset: current.end,
          quoted_text: '',
          count: current.count,
          intensity: maxCount > 0 ? current.count / maxCount : 0,
        });
        current = seg;
      }
    }
    merged.push({
      start_offset: current.start,
      end_offset: current.end,
      quoted_text: '',
      count: current.count,
      intensity: maxCount > 0 ? current.count / maxCount : 0,
    });

    // Attempt to fill in quoted_text from the comment body
    const comment = await db('comments').where({ id: commentId }).first();
    if (comment && typeof comment.body === 'string') {
      for (const seg of merged) {
        seg.quoted_text = comment.body.slice(seg.start_offset, seg.end_offset);
      }
    }

    return merged;
  }

  async createSelfEval(
    commentId: string,
    agentUserId: string,
    selfEvalData: SelfEvalDataInput,
    body: string
  ): Promise<Record<string, unknown>> {
    const comment = await db('comments').where({ id: commentId, is_deleted: false }).first();
    if (!comment) {
      throw new MetaServiceError('Comment not found', 'NOT_FOUND');
    }

    // Verify the agent is the author of this comment
    if (comment.author_id !== agentUserId) {
      throw new MetaServiceError('Agent can only self-evaluate its own comments', 'FORBIDDEN');
    }

    // Check for existing self-eval on this comment by this agent
    const existingSelfEval = await db('meta_comments')
      .where({
        comment_id: commentId,
        author_id: agentUserId,
        is_self_eval: true,
        is_deleted: false,
      })
      .first();

    if (existingSelfEval) {
      throw new MetaServiceError('Self-evaluation already exists for this comment', 'CONFLICT');
    }

    const contentHash = HashService.hashCommentContent(body);
    const immutableId = uuidv4();

    const [metaComment] = await db('meta_comments')
      .insert({
        immutable_id: immutableId,
        comment_id: commentId,
        author_id: agentUserId,
        parent_meta_id: null,
        body,
        is_self_eval: true,
        self_eval_data: JSON.stringify(selfEvalData),
        score: 0,
        content_hash: contentHash,
        is_deleted: false,
      })
      .returning('*');

    await db('comments').where({ id: commentId }).increment('meta_count', 1);

    return metaComment;
  }

  async voteOnMetaComment(
    metaId: string,
    userId: string,
    value: 1 | -1
  ): Promise<Record<string, unknown>> {
    const meta = await db('meta_comments')
      .where({ id: metaId, is_deleted: false })
      .first();

    if (!meta) {
      throw new MetaServiceError('Meta-comment not found', 'NOT_FOUND');
    }

    // Use votes table with target_type = 'meta_comment'
    const existing = await db('votes')
      .where({ user_id: userId, target_type: 'meta_comment', target_id: metaId })
      .first();

    if (existing) {
      if (existing.value === value) {
        // Remove vote (toggle off)
        await db('votes').where({ id: existing.id }).del();
        const scoreDelta = -value;
        await db('meta_comments').where({ id: metaId }).increment('score', scoreDelta);
      } else {
        // Change vote direction
        await db('votes').where({ id: existing.id }).update({ value });
        // Delta is 2x the new value (remove old, add new)
        const scoreDelta = 2 * value;
        await db('meta_comments').where({ id: metaId }).increment('score', scoreDelta);
      }
    } else {
      await db('votes').insert({
        user_id: userId,
        target_type: 'meta_comment',
        target_id: metaId,
        value,
      });
      await db('meta_comments').where({ id: metaId }).increment('score', value);
    }

    const updated = await db('meta_comments').where({ id: metaId }).first();
    return updated;
  }

  async getById(id: string): Promise<Record<string, unknown> | undefined> {
    return db('meta_comments').where({ id, is_deleted: false }).first();
  }
}

export class MetaServiceError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    Object.setPrototypeOf(this, MetaServiceError.prototype);
  }
}

export const metaService = new MetaService();
