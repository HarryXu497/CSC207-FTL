import { Router } from 'express';
import { z } from 'zod';
import { AnalyzeAccuracyPresenter } from './AnalyzeAccuracy/presenter';
import type { AnalyzeAccuracyInputBoundary } from './AnalyzeAccuracy/input';
import type { AnalyzeAccuracyOutputBoundary } from './AnalyzeAccuracy/output';
import { MAX_MESSAGES, MAX_MESSAGE_CHARS, MAX_TOPIC_CHARS, MAX_TRANSCRIPT_CHARS } from './limits';

// Runtime request body validation. The shape matches `Message` so stored calls can be analysed too.
const analyzeAccuracySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['agent', 'customer']),
        content: z.string().trim().min(1, 'Message content is required.').max(MAX_MESSAGE_CHARS),
      }),
    )
    .min(1, 'At least one message is required.')
    .max(MAX_MESSAGES)
    .refine(
      (messages) =>
        messages.reduce((total, m) => total + m.content.length, 0) <= MAX_TRANSCRIPT_CHARS,
      `The transcript is too long (at most ${MAX_TRANSCRIPT_CHARS.toLocaleString('en-US')} characters of message text).`,
    ),
  topic: z.string().trim().max(MAX_TOPIC_CHARS).optional(),
});

export class AccuracyController {
  /** `null` when the LLM or knowledge base is not configured; the route then answers 503. */
  constructor(private readonly analyzeAccuracy: AnalyzeAccuracyInputBoundary | null) {}

  async analyze(body: unknown, presenter: AnalyzeAccuracyOutputBoundary): Promise<void> {
    if (!this.analyzeAccuracy) {
      presenter.presentServiceUnavailable();
      return;
    }

    const parsed = analyzeAccuracySchema.safeParse(body);

    if (!parsed.success) {
      presenter.presentBadRequest(
        'That request was not valid.',
        parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      );
      return;
    }

    await this.analyzeAccuracy.handle(parsed.data, presenter);
  }

  router(): Router {
    const router = Router();

    router.post('/accuracy/analyze', async (req, res) =>
      this.analyze(req.body, new AnalyzeAccuracyPresenter(res)),
    );

    return router;
  }
}
