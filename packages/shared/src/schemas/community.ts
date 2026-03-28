import { z } from 'zod';

export const createCommunitySchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores allowed'),
  display_name: z
    .string()
    .min(3, 'Display name must be at least 3 characters')
    .max(100, 'Display name must be at most 100 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
});

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
