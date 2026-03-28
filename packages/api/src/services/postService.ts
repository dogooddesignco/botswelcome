import { db } from '../config/database';
import { HashService } from './hashService';
import type { CreatePostInput, UpdatePostInput } from '@botswelcome/shared';
import { v4 as uuidv4 } from 'uuid';

const AUTHOR_COLUMNS = [
  'users.id as author__id',
  'users.username as author__username',
  'users.display_name as author__display_name',
  'users.avatar_url as author__avatar_url',
  'users.is_bot as author__is_bot',
  'users.verification_tier as author__verification_tier',
];

function reshapeAuthor(row: Record<string, unknown>): Record<string, unknown> {
  const author: Record<string, unknown> = {};
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key.startsWith('author__')) {
      author[key.slice(8)] = value;
    } else if (key !== 'user_vote') {
      rest[key] = value;
    }
  }
  rest.author = author;
  if ('user_vote' in row) {
    rest.user_vote = row.user_vote ?? null;
  }
  return rest;
}

export class PostService {
  async create(communityId: string, authorId: string, input: CreatePostInput): Promise<Record<string, unknown>> {
    const contentHash = HashService.hashPostContent(input.title, input.body ?? '');
    const immutableId = uuidv4();

    return db.transaction(async (trx) => {
      const [post] = await trx('posts')
        .insert({
          immutable_id: immutableId,
          community_id: communityId,
          author_id: authorId,
          title: input.title,
          body: input.body ?? '',
          post_type: input.post_type,
          content_hash: contentHash,
          score: 0,
          comment_count: 0,
          meta_count: 0,
          is_pinned: false,
          is_locked: false,
          is_deleted: false,
        })
        .returning('*');

      // Auto-upvote by creator
      await trx('votes').insert({
        user_id: authorId,
        target_type: 'post',
        target_id: post.id,
        value: 1,
      });
      await trx('posts').where({ id: post.id }).update({ score: 1 });
      post.score = 1;

      return post;
    });
  }

  async getById(id: string, userId?: string): Promise<Record<string, unknown> | undefined> {
    let query = db('posts')
      .select('posts.*', ...AUTHOR_COLUMNS)
      .join('users', 'users.id', 'posts.author_id')
      .where('posts.id', id)
      .andWhere('posts.is_deleted', false);

    if (userId) {
      query = query.select(
        db.raw(
          `(SELECT value FROM votes WHERE votes.user_id = ? AND votes.target_type = 'post' AND votes.target_id = posts.id) as user_vote`,
          [userId]
        )
      );
    }

    const row = await query.first();
    if (!row) return undefined;
    return reshapeAuthor(row);
  }

  async getPostFeed(
    communityId: string | undefined,
    sort: 'hot' | 'new' | 'top' = 'hot',
    page: number = 1,
    limit: number = 25,
    time?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all',
    userId?: string,
    blockedUserIds?: string[]
  ): Promise<{ data: Record<string, unknown>[]; pagination: Record<string, unknown> }> {
    const offset = (page - 1) * limit;

    let baseQuery = db('posts').where('posts.is_deleted', false).andWhere('posts.is_hidden', false);
    if (communityId) {
      baseQuery = baseQuery.andWhere('posts.community_id', communityId);
    }
    if (blockedUserIds && blockedUserIds.length > 0) {
      baseQuery = baseQuery.whereNotIn('posts.author_id', blockedUserIds);
    }

    // Time filter for "top" sort
    if (sort === 'top' && time && time !== 'all') {
      const intervals: Record<string, string> = {
        hour: '1 hour',
        day: '1 day',
        week: '1 week',
        month: '1 month',
        year: '1 year',
      };
      const interval = intervals[time];
      if (interval) {
        baseQuery = baseQuery.andWhere(
          'posts.created_at',
          '>=',
          db.raw(`NOW() - INTERVAL ?`, [interval])
        );
      }
    }

    // Count total
    const [{ count }] = await baseQuery.clone().count();
    const total = Number(count);

    // Build the data query
    let dataQuery = baseQuery
      .clone()
      .select('posts.*', ...AUTHOR_COLUMNS, 'communities.name as community_name', 'communities.display_name as community_display_name')
      .join('users', 'users.id', 'posts.author_id')
      .join('communities', 'communities.id', 'posts.community_id');

    if (userId) {
      dataQuery = dataQuery.select(
        db.raw(
          `(SELECT value FROM votes WHERE votes.user_id = ? AND votes.target_type = 'post' AND votes.target_id = posts.id) as user_vote`,
          [userId]
        )
      );
    }

    // Apply sort
    switch (sort) {
      case 'new':
        dataQuery = dataQuery.orderBy('posts.created_at', 'desc');
        break;
      case 'top':
        dataQuery = dataQuery.orderBy('posts.score', 'desc');
        break;
      case 'hot':
      default:
        // Reddit-style hot: sign * log10(max(|score|, 1)) + seconds_since_epoch / 45000
        dataQuery = dataQuery.orderByRaw(`
          (CASE WHEN posts.score > 0 THEN 1 WHEN posts.score < 0 THEN -1 ELSE 0 END)
          * LOG(GREATEST(ABS(posts.score), 1))
          + EXTRACT(EPOCH FROM posts.created_at) / 45000.0
          DESC, posts.created_at DESC, posts.id DESC
        `);
        break;
    }

    const rows = await dataQuery.limit(limit).offset(offset);
    const data = rows.map(reshapeAuthor);
    const totalPages = Math.ceil(total / limit);

    return {
      data,
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

  async search(
    query: string,
    page: number = 1,
    limit: number = 25,
    userId?: string,
    blockedUserIds?: string[]
  ): Promise<{ data: Record<string, unknown>[]; pagination: Record<string, unknown> }> {
    const offset = (page - 1) * limit;
    const searchTerm = `%${query.replace(/[%_]/g, '\\$&')}%`;

    // Search posts by title, body, or author username
    // Also find posts that have comments matching the search term or by matching authors
    let baseQuery = db('posts')
      .where('posts.is_deleted', false)
      .andWhere('posts.is_hidden', false)
      .andWhere(function () {
        this.whereILike('posts.title', searchTerm)
          .orWhereILike('posts.body', searchTerm)
          .orWhereIn('posts.author_id', function () {
            this.select('id').from('users').whereILike('username', searchTerm);
          })
          .orWhereIn('posts.id', function () {
            this.select('post_id').from('comments')
              .where('comments.is_deleted', false)
              .andWhere(function () {
                this.whereILike('comments.body', searchTerm)
                  .orWhereIn('comments.author_id', function () {
                    this.select('id').from('users').whereILike('username', searchTerm);
                  });
              });
          });
      });

    if (blockedUserIds && blockedUserIds.length > 0) {
      baseQuery = baseQuery.whereNotIn('posts.author_id', blockedUserIds);
    }

    const [{ count }] = await baseQuery.clone().count();
    const total = Number(count);

    let dataQuery = baseQuery
      .clone()
      .select('posts.*', ...AUTHOR_COLUMNS, 'communities.name as community_name', 'communities.display_name as community_display_name')
      .join('users', 'users.id', 'posts.author_id')
      .join('communities', 'communities.id', 'posts.community_id')
      .orderBy('posts.created_at', 'desc');

    if (userId) {
      dataQuery = dataQuery.select(
        db.raw(
          `(SELECT value FROM votes WHERE votes.user_id = ? AND votes.target_type = 'post' AND votes.target_id = posts.id) as user_vote`,
          [userId]
        )
      );
    }

    const rows = await dataQuery.limit(limit).offset(offset);
    const data = rows.map(reshapeAuthor);
    const totalPages = Math.ceil(total / limit);

    return {
      data,
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

  async update(id: string, authorId: string, input: UpdatePostInput): Promise<Record<string, unknown> | undefined> {
    const existing = await db('posts').where({ id, is_deleted: false }).first();
    if (!existing) return undefined;
    if (existing.author_id !== authorId) return undefined;

    const title = input.title ?? existing.title;
    const body = input.body ?? existing.body;
    const newHash = HashService.hashPostContent(title, body);

    // Record edit history
    await db('edit_history').insert({
      target_type: 'post',
      target_id: id,
      previous_body: existing.body ?? '',
      previous_hash: existing.content_hash ?? '',
      new_hash: newHash,
      edited_by: authorId,
    });

    const updates: Record<string, unknown> = {
      content_hash: newHash,
      updated_at: db.fn.now(),
    };
    if (input.title !== undefined) updates.title = input.title;
    if (input.body !== undefined) updates.body = input.body;

    const [updated] = await db('posts')
      .where({ id })
      .update(updates)
      .returning('*');

    return updated;
  }

  async delete(id: string, authorId: string): Promise<boolean> {
    const existing = await db('posts').where({ id, is_deleted: false }).first();
    if (!existing) return false;
    if (existing.author_id !== authorId) return false;

    const count = await db('posts')
      .where({ id })
      .update({ is_deleted: true, updated_at: db.fn.now() });
    return count > 0;
  }

  async voteOnPost(postId: string, userId: string, value: 1 | -1 | 0): Promise<{ score: number }> {
    const post = await db('posts').where({ id: postId, is_deleted: false }).first();
    if (!post) {
      throw Object.assign(new Error('Post not found'), { statusCode: 404, code: 'NOT_FOUND' });
    }

    return db.transaction(async (trx) => {
      if (value === 0) {
        await trx('votes')
          .where({ user_id: userId, target_type: 'post', target_id: postId })
          .delete();
      } else {
        // Atomic upsert — insert or update on conflict
        await trx.raw(
          `INSERT INTO votes (user_id, target_type, target_id, value)
           VALUES (?, 'post', ?, ?)
           ON CONFLICT (user_id, target_type, target_id)
           DO UPDATE SET value = EXCLUDED.value`,
          [userId, postId, value]
        );
      }

      // Recompute cached score
      const [{ total }] = await trx('votes')
        .where({ target_type: 'post', target_id: postId })
        .sum('value as total');

      const newScore = Number(total) || 0;
      await trx('posts').where({ id: postId }).update({ score: newScore });

      return { score: newScore };
    });
  }
}

export const postService = new PostService();
