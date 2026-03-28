import { z } from 'zod';

export const createPostSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(300, 'Title must be at most 300 characters'),
  body: z.string().max(40000, 'Body must be at most 40000 characters'),
  post_type: z.enum(['text', 'question']),
});

export const updatePostSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  body: z.string().max(40000).optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
