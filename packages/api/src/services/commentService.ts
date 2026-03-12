import { db } from '../config/database';
import { HashService } from './hashService';
import type { CreateCommentInput, UpdateCommentInput } from '@botswelcome/shared';
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

export class CommentService {
  async create(postId: string, authorId: string, body: string, parentId?: string | null): Promise<Record<string, unknown>> {
    // Verify post exists and is not deleted
    const post = await db('posts').where({ id: postId, is_deleted: false }).first();
    if (!post) {
      throw Object.assign(new Error('Post not found'), { statusCode: 404, code: 'NOT_FOUND' });
    }

    const contentHash = HashService.hashCommentContent(body);
    const immutableId = uuidv4();

    let depth = 0;
    let parentPath = '';

    if (parentId) {
      const parent = await db('comments').where({ id: parentId, is_deleted: false }).first();
      if (!parent) {
        throw Object.assign(new Error('Parent comment not found'), { statusCode: 404, code: 'NOT_FOUND' });
      }
      if (parent.post_id !== postId) {
        throw Object.assign(new Error('Parent comment does not belong to this post'), { statusCode: 400, code: 'BAD_REQUEST' });
      }
      depth = (parent.depth as number) + 1;
      parentPath = parent.path as string;
    }

    const [comment] = await db('comments')
      .insert({
        immutable_id: immutableId,
        post_id: postId,
        parent_id: parentId ?? null,
        author_id: authorId,
        body,
        content_hash: contentHash,
        score: 0,
        meta_count: 0,
        depth,
        path: '', // placeholder, will update after we have the id
        is_deleted: false,
      })
      .returning('*');

    // Set materialized path: parent_path/comment_id or just comment_id
    const path = parentPath ? `${parentPath}/${comment.id}` : comment.id;
    await db('comments').where({ id: comment.id }).update({ path });
    comment.path = path;

    // Increment post comment count
    await db('posts').where({ id: postId }).increment('comment_count', 1);

    // Auto-upvote by creator
    await db('votes').insert({
      user_id: authorId,
      target_type: 'comment',
      target_id: comment.id,
      value: 1,
    });
    await db('comments').where({ id: comment.id }).update({ score: 1 });
    comment.score = 1;

    return comment;
  }

  async getById(id: string): Promise<Record<string, unknown> | undefined> {
    return db('comments').where({ id, is_deleted: false }).first();
  }

  async getCommentTree(
    postId: string,
    sort: 'best' | 'new' | 'old' = 'best',
    page: number = 1,
    limit: number = 50,
    userId?: string
  ): Promise<{ data: Record<string, unknown>[]; pagination: Record<string, unknown> }> {
    // Get all comments for the post (we need all to build the tree)
    // But we paginate on top-level comments
    const topLevelQuery = db('comments')
      .where({ post_id: postId, parent_id: null, is_deleted: false });

    const [{ count }] = await topLevelQuery.clone().count();
    const total = Number(count);
    const offset = (page - 1) * limit;

    // Get top-level comments (paginated)
    let topLevelDataQuery = topLevelQuery.clone();
    switch (sort) {
      case 'new':
        topLevelDataQuery = topLevelDataQuery.orderBy('created_at', 'desc');
        break;
      case 'old':
        topLevelDataQuery = topLevelDataQuery.orderBy('created_at', 'asc');
        break;
      case 'best':
      default:
        topLevelDataQuery = topLevelDataQuery.orderBy('score', 'desc');
        break;
    }
    const topLevelComments = await topLevelDataQuery.limit(limit).offset(offset);

    if (topLevelComments.length === 0) {
      const totalPages = Math.ceil(total / limit);
      return {
        data: [],
        pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
      };
    }

    // Get all descendant comments for these top-level comments using path prefix matching
    const topLevelIds = topLevelComments.map((c: Record<string, unknown>) => c.id as string);

    // Build path prefix conditions: path LIKE 'topLevelId/%' OR path = 'topLevelId'
    let descendantsQuery = db('comments')
      .where('post_id', postId)
      .andWhere(function () {
        for (const tlId of topLevelIds) {
          this.orWhere('path', 'like', `${tlId}/%`);
        }
      });

    const descendants = await descendantsQuery;

    // Combine all comments
    const allComments = [...topLevelComments, ...descendants];
    const allIds = allComments.map((c: Record<string, unknown>) => c.id as string);

    // Fetch author info for all comments
    const authorRows = await db('comments')
      .select('comments.*', ...AUTHOR_COLUMNS)
      .join('users', 'users.id', 'comments.author_id')
      .whereIn('comments.id', allIds);

    // If user is authenticated, fetch their votes on these comments
    let userVotes: Map<string, number> = new Map();
    if (userId && allIds.length > 0) {
      const votes = await db('votes')
        .where({ user_id: userId, target_type: 'comment' })
        .whereIn('target_id', allIds);
      for (const v of votes) {
        userVotes.set(v.target_id, v.value);
      }
    }

    // Reshape with author info
    const commentMap = new Map<string, Record<string, unknown>>();
    for (const row of authorRows) {
      const shaped = reshapeAuthor(row);
      shaped.user_vote = userVotes.get(shaped.id as string) ?? null;
      shaped.children = [];
      // For deleted comments, redact body but keep the node in the tree
      if (shaped.is_deleted) {
        shaped.body = '[deleted]';
        shaped.author = null;
      }
      commentMap.set(shaped.id as string, shaped);
    }

    // Build tree structure from materialized paths
    const roots: Record<string, unknown>[] = [];
    // Sort all entries by path to ensure parents come before children
    const sortedEntries = Array.from(commentMap.values()).sort((a, b) => {
      const pathA = a.path as string;
      const pathB = b.path as string;
      return pathA.localeCompare(pathB);
    });

    for (const comment of sortedEntries) {
      const parentId = comment.parent_id as string | null;
      if (!parentId || !commentMap.has(parentId)) {
        roots.push(comment);
      } else {
        const parent = commentMap.get(parentId)!;
        (parent.children as Record<string, unknown>[]).push(comment);
      }
    }

    // Sort children at each level
    const sortChildren = (nodes: Record<string, unknown>[]) => {
      nodes.sort((a, b) => {
        switch (sort) {
          case 'new':
            return new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime();
          case 'old':
            return new Date(a.created_at as string).getTime() - new Date(b.created_at as string).getTime();
          case 'best':
          default:
            return (b.score as number) - (a.score as number);
        }
      });
      for (const node of nodes) {
        if ((node.children as unknown[]).length > 0) {
          sortChildren(node.children as Record<string, unknown>[]);
        }
      }
    };
    sortChildren(roots);

    const totalPages = Math.ceil(total / limit);
    return {
      data: roots,
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

  async update(commentId: string, authorId: string, body: string): Promise<Record<string, unknown> | undefined> {
    const existing = await db('comments').where({ id: commentId, is_deleted: false }).first();
    if (!existing) return undefined;
    if (existing.author_id !== authorId) return undefined;

    const newHash = HashService.hashCommentContent(body);

    // Record edit history
    await db('edit_history').insert({
      target_type: 'comment',
      target_id: commentId,
      previous_body: existing.body,
      previous_hash: existing.content_hash ?? '',
      new_hash: newHash,
      edited_by: authorId,
    });

    const [updated] = await db('comments')
      .where({ id: commentId })
      .update({
        body,
        content_hash: newHash,
        updated_at: db.fn.now(),
      })
      .returning('*');

    return updated;
  }

  async delete(commentId: string, authorId: string): Promise<boolean> {
    const existing = await db('comments').where({ id: commentId, is_deleted: false }).first();
    if (!existing) return false;
    if (existing.author_id !== authorId) return false;

    const count = await db('comments')
      .where({ id: commentId })
      .update({ is_deleted: true, updated_at: db.fn.now() });
    return count > 0;
  }

  async voteOnComment(commentId: string, userId: string, value: 1 | -1 | 0): Promise<{ score: number }> {
    const comment = await db('comments').where({ id: commentId, is_deleted: false }).first();
    if (!comment) {
      throw Object.assign(new Error('Comment not found'), { statusCode: 404, code: 'NOT_FOUND' });
    }

    const existingVote = await db('votes')
      .where({ user_id: userId, target_type: 'comment', target_id: commentId })
      .first();

    if (value === 0) {
      if (existingVote) {
        await db('votes')
          .where({ user_id: userId, target_type: 'comment', target_id: commentId })
          .delete();
      }
    } else if (existingVote) {
      await db('votes')
        .where({ user_id: userId, target_type: 'comment', target_id: commentId })
        .update({ value });
    } else {
      await db('votes').insert({
        user_id: userId,
        target_type: 'comment',
        target_id: commentId,
        value,
      });
    }

    // Recompute cached score
    const [{ total }] = await db('votes')
      .where({ target_type: 'comment', target_id: commentId })
      .sum('value as total');

    const newScore = Number(total) || 0;
    await db('comments').where({ id: commentId }).update({ score: newScore });

    return { score: newScore };
  }
}

export const commentService = new CommentService();
