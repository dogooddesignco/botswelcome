import { db } from '../config/database';

export type NotificationType = 'reply' | 'meta_comment' | 'reaction' | 'mention';

export class NotificationService {
  /**
   * Create a notification. Silently skips if source_user_id === recipient user_id
   * (don't notify yourself).
   */
  async create(
    userId: string,
    type: NotificationType,
    sourceUserId: string | null,
    targetType: 'post' | 'comment' | 'meta_comment',
    targetId: string
  ): Promise<void> {
    // Don't notify yourself
    if (sourceUserId && sourceUserId === userId) return;

    try {
      await db('notifications').insert({
        user_id: userId,
        type,
        source_user_id: sourceUserId,
        target_type: targetType,
        target_id: targetId,
      });
    } catch {
      // Non-critical — don't break the main flow if notification fails
    }
  }

  /**
   * Notify when someone replies to a comment.
   * Notifies the original comment's author.
   */
  async notifyReply(
    parentCommentId: string,
    replyAuthorId: string,
    replyId: string
  ): Promise<void> {
    const parent = await db('comments')
      .where({ id: parentCommentId, is_deleted: false })
      .first();
    if (!parent) return;

    await this.create(
      parent.author_id,
      'reply',
      replyAuthorId,
      'comment',
      replyId
    );
  }

  /**
   * Notify when someone comments on a post.
   * Notifies the post author AND all other users who have commented on the post.
   */
  async notifyPostComment(
    postId: string,
    commentAuthorId: string,
    commentId: string
  ): Promise<void> {
    const post = await db('posts')
      .where({ id: postId, is_deleted: false })
      .first();
    if (!post) return;

    // Notify post author
    await this.create(
      post.author_id,
      'reply',
      commentAuthorId,
      'comment',
      commentId
    );

    // Notify all other participants in this thread
    const participants = await db('comments')
      .where({ post_id: postId, is_deleted: false })
      .whereNot({ author_id: commentAuthorId })
      .distinct('author_id');

    for (const p of participants) {
      // Skip the post author (already notified above)
      if (p.author_id === post.author_id) continue;
      await this.create(
        p.author_id,
        'reply',
        commentAuthorId,
        'comment',
        commentId
      );
    }
  }

  /**
   * Get notifications for a user, with source user info.
   */
  async getForUser(
    userId: string,
    options: { unreadOnly?: boolean; limit?: number } = {}
  ): Promise<Record<string, unknown>[]> {
    const { unreadOnly = false, limit = 50 } = options;

    const query = db('notifications')
      .leftJoin('users as source', 'source.id', 'notifications.source_user_id')
      .where({ 'notifications.user_id': userId })
      .select(
        'notifications.id',
        'notifications.type',
        'notifications.target_type',
        'notifications.target_id',
        'notifications.is_read',
        'notifications.created_at',
        'source.id as source_user_id',
        'source.username as source_username',
        'source.is_bot as source_is_bot'
      )
      .orderBy('notifications.created_at', 'desc')
      .limit(limit);

    if (unreadOnly) {
      query.where({ 'notifications.is_read': false });
    }

    return query;
  }

  /**
   * Mark notifications as read.
   */
  async markRead(userId: string, notificationIds?: string[]): Promise<number> {
    const query = db('notifications')
      .where({ user_id: userId, is_read: false });

    if (notificationIds && notificationIds.length > 0) {
      query.whereIn('id', notificationIds);
    }

    const updated = await query.update({ is_read: true });
    return updated;
  }
}

export const notificationService = new NotificationService();
