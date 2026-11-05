import type { AnalyzeAccuracyResponse } from '@recall/shared';
import { Router } from 'express';
import { LlmOutputError, type AccuracyService } from 'src/service';
import { z } from 'zod';
import { MAX_TRANSCRIPT_CHARS } from '../limits';
import { buildErrorFromSafeParseError } from '../utils';

// Runtime request body validation using zod
const analyzeAccuracySchema = z.object({
  messages: z
    .array(
      z.object({
        speaker: z.enum(['agent', 'customer']),
        text: z.string().trim().min(1, 'Message text is required.').max(4000),
        time: z.string().optional(),
      }),
    )
    .min(1, 'At least one message is required.')
    .max(200)
    // Keeps valid requests inside the body size limit and bounds the LLM cost of one analysis.
    .refine(
      (messages) => messages.reduce((total, m) => total + m.text.length, 0) <= MAX_TRANSCRIPT_CHARS,
      `The transcript is too long (at most ${MAX_TRANSCRIPT_CHARS.toLocaleString('en-US')} characters of message text).`,
    ),
  topic: z.string().trim().max(300).optional(),
});

export function createAccuracyRouter(
  analyzeAccuracy: InstanceType<typeof AccuracyService.AnalyzeAccuracy> | undefined,
): Router {
  const router = Router();

  // Compute the accuracy metric for a transcript. Nothing is stored.
  router.post('/accuracy/analyze', async (req, res) => {
    // The LLM and knowledge base are optional at boot, so say so plainly instead of crashing.
    if (!analyzeAccuracy) {
      res.status(503).json({
        error: { message: 'Accuracy analysis is not configured on this server.' },
      });
      return;
    }

    const parsed = analyzeAccuracySchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: buildErrorFromSafeParseError(parsed, 'That request was not valid.'),
      });
      return;
    }

    try {
      const accuracy = await analyzeAccuracy.handle(parsed.data);
      res.json({ accuracy } satisfies AnalyzeAccuracyResponse);
    } catch (error) {
      // The model returned something unusable: an upstream failure, not our bug or the caller's.
      if (error instanceof LlmOutputError) {
        res
          .status(502)
          .json({ error: { message: 'The language model returned an unusable reply.' } });
        return;
      }
      throw error;
    }
  });

  return router;
}
