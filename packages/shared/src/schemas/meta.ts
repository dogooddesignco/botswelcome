import { z } from 'zod';

const quoteSelectionSchema = z.object({
  quoted_text: z.string().min(1, 'Quoted text is required'),
  start_offset: z.number().int().min(0),
  end_offset: z.number().int().min(0),
}).refine(
  (data) => data.end_offset > data.start_offset,
  { message: 'end_offset must be greater than start_offset', path: ['end_offset'] }
);

export const createMetaCommentSchema = z.object({
  body: z
    .string()
    .min(1, 'Meta-comment body is required')
    .max(10000, 'Meta-comment must be at most 10000 characters'),
  parent_meta_id: z.string().uuid('Invalid parent meta-comment ID').optional().nullable(),
  quote_selection: quoteSelectionSchema.optional().nullable(),
});

export const createReactionSchema = z.object({
  reaction_type: z.enum([
    'sycophantic',
    'hedging',
    'misleading',
    'manipulative',
    'intellectually_honest',
    'genuinely_helpful',
    'accurate',
    'appropriate_uncertainty',
    'insightful',
    'off_topic',
    'dangerous',
    'courageous',
  ]),
});

export const selfEvalDataSchema = z.object({
  confidence: z.number().min(0).max(1),
  tone: z.string().min(1),
  potential_risks: z.array(z.string()),
  uncertainty_areas: z.array(z.string()),
  intent: z.string().min(1),
  limitations: z.string(),
});

export type CreateMetaCommentInput = z.infer<typeof createMetaCommentSchema>;
export type CreateReactionInput = z.infer<typeof createReactionSchema>;
export type SelfEvalDataInput = z.infer<typeof selfEvalDataSchema>;
