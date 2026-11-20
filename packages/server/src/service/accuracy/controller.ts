import { Router, type Request } from 'express';
import { NotFoundError } from 'src/errors';
import {
  FirestoreCallRepository,
  type AccuracyAnalyzer,
  type AccuracyRepository,
  type CallRepository,
  type MessageRepositoryBuilder,
} from 'src/repository';
import { z } from 'zod';
import {
  AnalyzeAccuracyInteractor,
  AnalyzeAccuracyPresenter,
  type AnalyzeAccuracyOutputBoundary,
} from './AnalyzeAccuracy';
import {
  GetAccuracyInteractor,
  GetAccuracyPresenter,
  type GetAccuracyOutputBoundary,
} from './GetAccuracy';

/** Bounds the LLM cost of one analysis. */
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

export class AccuracyController {
  constructor(
    private readonly analyzer: AccuracyAnalyzer | null,
    private readonly accuracyRepo: AccuracyRepository,
    private readonly callRepo: CallRepository,
    private readonly messageRepoFactory: MessageRepositoryBuilder,
  ) {}

  /** Analyzes a transcript sent in the request body. Nothing is stored. */
  async analyzeAccuracy(req: Request, presenter: AnalyzeAccuracyOutputBoundary) {
    if (!this.analyzer) {
      presenter.presentServiceUnavailable();
      return;
    }

    const parsed = analyzeAccuracySchema.safeParse(req.body);

    if (!parsed.success) {
      presentInvalid(presenter, parsed.error);
      return;
    }

    const interactor = new AnalyzeAccuracyInteractor(this.analyzer, this.accuracyRepo);

    await interactor.handle(parsed.data, presenter);
  }

  /** Analyzes the stored transcript of a call and saves the result under that call. */
  async analyzeCallAccuracy(req: Request, presenter: AnalyzeAccuracyOutputBoundary) {
    if (!this.analyzer) {
      presenter.presentServiceUnavailable();
      return;
    }

    const callId = req.params.callId;

    if (!callId || typeof callId !== 'string') {
      presenter.presentBadRequest('callId is required');
      return;
    }

    let topic: string;

    try {
      topic = (await this.callRepo.getCall(callId)).topic;
    } catch (e) {
      if (e instanceof NotFoundError) {
        presenter.presentNotFound(`Call with id ${callId} not found.`);
        return;
      }

      throw e;
    }

    const messages = await this.messageRepoFactory(
      FirestoreCallRepository.COLLECTION,
      callId,
    ).getAllMessages();

    // The stored transcript goes through the same limits as one sent in a request body.
    const parsed = analyzeAccuracySchema.safeParse({
      messages: messages.map(({ role, content }) => ({ role, content })),
      topic,
    });

    if (!parsed.success) {
      presentInvalid(presenter, parsed.error);
      return;
    }

    const interactor = new AnalyzeAccuracyInteractor(this.analyzer, this.accuracyRepo);

    await interactor.handle({ callId, ...parsed.data }, presenter);
  }

  /** Reads the saved result for a call. */
  async getAccuracy(req: Request, presenter: GetAccuracyOutputBoundary) {
    const callId = req.params.callId;

    if (!callId || typeof callId !== 'string') {
      presenter.presentNotFound('callId is required');
      return;
    }

    await new GetAccuracyInteractor(this.accuracyRepo).handle({ callId }, presenter);
  }

  router(): Router {
    const router = Router();

    router.post('/accuracy/analyze', async (req, res) =>
      this.analyzeAccuracy(req, new AnalyzeAccuracyPresenter(res)),
    );

    router.post('/calls/:callId/accuracy', async (req, res) =>
      this.analyzeCallAccuracy(req, new AnalyzeAccuracyPresenter(res)),
    );

    router.get('/calls/:callId/accuracy', async (req, res) =>
      this.getAccuracy(req, new GetAccuracyPresenter(res)),
    );

    return router;
  }
}

function presentInvalid(presenter: AnalyzeAccuracyOutputBoundary, error: z.ZodError) {
  presenter.presentBadRequest(
    'That request was not valid.',
    error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
  );
}
