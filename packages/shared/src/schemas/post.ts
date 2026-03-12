import { z } from 'zod';

export const createPostSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(300, 'Title must be at most 300 characters'),
  body: z.string().max(40000, 'Body must be at most 40000 characters'),
  post_type: z.enum(['text', 'link', 'question']),
  url: z.string().url('Invalid URL').optional().nullable(),
}).refine(
  (data) => {
    if (data.post_type === 'link') return !!data.url;
    return true;
  },
  { message: 'URL is required for link posts', path: ['url'] }
);

export const updatePostSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  body: z.string().max(40000).optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
