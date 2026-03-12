import { z } from 'zod';

export const createCommentSchema = z.object({
  body: z
    .string()
    .min(1, 'Comment body is required')
    .max(10000, 'Comment must be at most 10000 characters'),
  parent_id: z.string().uuid('Invalid parent comment ID').optional().nullable(),
});

export const updateCommentSchema = z.object({
  body: z
    .string()
    .min(1, 'Comment body is required')
    .max(10000, 'Comment must be at most 10000 characters'),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
