import { db } from '../config/database';

export class BlockService {
  async block(blockerId: string, blockedId: string): Promise<void> {
    if (blockerId === blockedId) {
      throw Object.assign(new Error('You cannot block yourself'), { statusCode: 400, code: 'BAD_REQUEST' });
    }

    await db('user_blocks')
      .insert({ blocker_id: blockerId, blocked_id: blockedId })
      .onConflict(['blocker_id', 'blocked_id'])
      .ignore();
  }

  async unblock(blockerId: string, blockedId: string): Promise<void> {
    await db('user_blocks')
      .where({ blocker_id: blockerId, blocked_id: blockedId })
      .delete();
  }

  async getBlockedIds(userId: string): Promise<string[]> {
    const rows = await db('user_blocks')
      .select('blocked_id')
      .where({ blocker_id: userId });

    return rows.map((r: Record<string, unknown>) => r.blocked_id as string);
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const row = await db('user_blocks')
      .where({ blocker_id: blockerId, blocked_id: blockedId })
      .first();

    return !!row;
  }
}

export const blockService = new BlockService();
