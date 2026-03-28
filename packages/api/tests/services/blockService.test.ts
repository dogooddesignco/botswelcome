import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database before importing the service
const mockInsert = vi.fn().mockReturnThis();
const mockOnConflict = vi.fn().mockReturnValue({ ignore: vi.fn().mockResolvedValue(undefined) });
const mockWhere = vi.fn().mockReturnThis();
const mockDelete = vi.fn().mockResolvedValue(1);
const mockSelect = vi.fn().mockReturnThis();
const mockFirst = vi.fn().mockResolvedValue(undefined);

vi.mock('../../src/config/database', () => ({
  db: Object.assign(
    (tableName: string) => ({
      insert: mockInsert,
      onConflict: mockOnConflict,
      where: mockWhere,
      delete: mockDelete,
      select: mockSelect,
      first: mockFirst,
    }),
    { fn: { now: vi.fn() } }
  ),
}));

// Import after mock is set up
import { BlockService, blockService } from '../../src/services/blockService';

describe('BlockService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('block', () => {
    it('should throw when blockerId equals blockedId (self-block)', async () => {
      const service = new BlockService();
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      await expect(service.block(userId, userId)).rejects.toThrow('You cannot block yourself');
    });

    it('should throw with statusCode 400 on self-block', async () => {
      const service = new BlockService();
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      try {
        await service.block(userId, userId);
        expect.fail('Expected error to be thrown');
      } catch (err: any) {
        expect(err.statusCode).toBe(400);
        expect(err.code).toBe('BAD_REQUEST');
      }
    });

    it('should not throw when blocking a different user', async () => {
      const service = new BlockService();
      await expect(
        service.block(
          '550e8400-e29b-41d4-a716-446655440000',
          '660e8400-e29b-41d4-a716-446655440000'
        )
      ).resolves.toBeUndefined();
    });
  });

  describe('exports', () => {
    it('should export a blockService singleton instance', () => {
      expect(blockService).toBeInstanceOf(BlockService);
    });

    it('should have the expected methods', () => {
      expect(typeof blockService.block).toBe('function');
      expect(typeof blockService.unblock).toBe('function');
      expect(typeof blockService.getBlockedIds).toBe('function');
      expect(typeof blockService.isBlocked).toBe('function');
    });
  });

  describe('getBlockedIds', () => {
    it('should return an array of blocked user IDs', async () => {
      const blockedId1 = '550e8400-e29b-41d4-a716-446655440001';
      const blockedId2 = '550e8400-e29b-41d4-a716-446655440002';

      mockWhere.mockReturnValueOnce([
        { blocked_id: blockedId1 },
        { blocked_id: blockedId2 },
      ]);

      const service = new BlockService();
      const result = await service.getBlockedIds('550e8400-e29b-41d4-a716-446655440000');
      expect(result).toEqual([blockedId1, blockedId2]);
    });
  });

  describe('isBlocked', () => {
    it('should return true when a block record exists', async () => {
      mockFirst.mockResolvedValueOnce({ blocker_id: 'a', blocked_id: 'b' });

      const service = new BlockService();
      const result = await service.isBlocked(
        '550e8400-e29b-41d4-a716-446655440000',
        '660e8400-e29b-41d4-a716-446655440000'
      );
      expect(result).toBe(true);
    });

    it('should return false when no block record exists', async () => {
      mockFirst.mockResolvedValueOnce(undefined);

      const service = new BlockService();
      const result = await service.isBlocked(
        '550e8400-e29b-41d4-a716-446655440000',
        '660e8400-e29b-41d4-a716-446655440000'
      );
      expect(result).toBe(false);
    });
  });
});
