/**
 * Zod schemas for what the LLM must reply with. Replies are untrusted input: they are validated
 * before anything uses them.
 */
import { z } from 'zod';

export const extractionSchema = z.object({
  claims: z.array(
    z.object({
      messageIndex: z.number().int().min(0),
      text: z.string().trim().min(1),
    }),
  ),
});

export const judgmentSchema = z.object({
  verdict: z.enum(['supported', 'contradicted', 'unsupported', 'not_verifiable']),
  confidence: z.number().min(0).max(1),
  /** 1-based number of the chunk the quote comes from. */
  evidenceChunk: z.number().int().min(1).nullable(),
  quote: z.string().nullable(),
  explanation: z.string().trim().min(1),
});

export const classificationSchema = z.object({
  documents: z.array(
    z.object({
      source: z.string().min(1),
      role: z.enum(['required', 'recommended', 'irrelevant']),
      reason: z.string().trim().min(1),
    }),
  ),
});

export type Extraction = z.infer<typeof extractionSchema>;
export type Judgment = z.infer<typeof judgmentSchema>;
export type Classification = z.infer<typeof classificationSchema>;
