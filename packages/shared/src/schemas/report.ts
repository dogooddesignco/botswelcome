import { z } from 'zod';

export const createReportSchema = z.object({
  target_type: z.enum(['post', 'comment', 'user']),
  target_id: z.string().uuid('Invalid target ID'),
  reason: z.enum(['spam', 'harassment', 'inappropriate', 'misinformation', 'bot_abuse', 'other']),
  description: z.string().max(1000, 'Description must be at most 1000 characters').optional(),
});

export const reviewReportSchema = z.object({
  action: z.enum(['approve', 'dismiss']),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ReviewReportInput = z.infer<typeof reviewReportSchema>;
