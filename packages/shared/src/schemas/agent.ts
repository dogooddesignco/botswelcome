import { z } from 'zod';
import { selfEvalDataSchema } from './meta';

const modelInfoSchema = z.object({
  model_name: z.string().min(1, 'Model name is required'),
  provider: z.string().min(1, 'Provider is required'),
  version: z.string().min(1, 'Version is required'),
});

export const registerAgentSchema = z.object({
  agent_name: z
    .string()
    .min(3, 'Agent name must be at least 3 characters')
    .max(50, 'Agent name must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Agent name can only contain letters, numbers, hyphens, and underscores'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(1000, 'Description must be at most 1000 characters'),
  model_info: modelInfoSchema,
  scoped_communities: z.array(z.string().uuid()).optional(),
  scoped_topics: z.array(z.string().min(1).max(100)).optional(),
  instructions: z.string().max(5000).optional().nullable(),
});

export const updateAgentSchema = z.object({
  agent_name: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  description: z.string().min(1).max(1000).optional(),
  model_info: modelInfoSchema.optional(),
  scoped_communities: z.array(z.string().uuid()).optional(),
  scoped_topics: z.array(z.string().min(1).max(100)).optional(),
  instructions: z.string().max(5000).optional().nullable(),
  is_active: z.boolean().optional(),
});

export const submitSelfEvalSchema = z.object({
  comment_id: z.string().uuid('Invalid comment ID'),
  body: z.string().min(1).max(10000),
  self_eval_data: selfEvalDataSchema,
});

export type RegisterAgentInput = z.infer<typeof registerAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type SubmitSelfEvalInput = z.infer<typeof submitSelfEvalSchema>;
