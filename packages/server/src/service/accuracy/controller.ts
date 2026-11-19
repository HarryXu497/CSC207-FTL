import { Router, type Request } from 'express';
import type { LlmClient, Retriever } from 'src/repository';
import { z } from 'zod';
import {
  AnalyzeAccuracyInteractor,
  AnalyzeAccuracyPresenter,
  type AnalyzeAccuracyOptions,
  type AnalyzeAccuracyOutputBoundary,
} from './AnalyzeAccuracy';

/** Most characters of message text per request; bounds the LLM cost of one analysis. */
export const MAX_TRANSCRIPT_CHARS = 30_000;

const analyzeAccuracySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['agent', 'customer']),
        content: z.string().trim().min(1, 'Message content is required.').max(4000),
      }),
    )
    .min(1, 'At least one message is required.')
    .max(200)
    .refine(
      (messages) =>
        messages.reduce((total, m) => total + m.content.length, 0) <= MAX_TRANSCRIPT_CHARS,
      `The transcript is too long (at most ${MAX_TRANSCRIPT_CHARS.toLocaleString('en-US')} characters of message text).`,
    ),
  topic: z.string().trim().max(300).optional(),
});

export interface AccuracyDependencies {
  llm: LlmClient;
  retriever: Retriever;
  options?: Partial<AnalyzeAccuracyOptions>;
}

export class AccuracyController {
  constructor(private readonly deps: AccuracyDependencies | null) {}

  async analyzeAccuracy(req: Request, presenter: AnalyzeAccuracyOutputBoundary) {
    if (!this.deps) {
      presenter.presentServiceUnavailable();
      return;
    }

    const parsed = analyzeAccuracySchema.safeParse(req.body);

    if (!parsed.success) {
      presenter.presentBadRequest(
        'That request was not valid.',
        parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      );
      return;
    }

    const interactor = new AnalyzeAccuracyInteractor(
      this.deps.llm,
      this.deps.retriever,
      this.deps.options,
    );

    await interactor.handle(parsed.data, presenter);
  }

  router(): Router {
    const router = Router();

    router.post('/accuracy/analyze', async (req, res) =>
      this.analyzeAccuracy(req, new AnalyzeAccuracyPresenter(res)),
    );

    return router;
  }
}
