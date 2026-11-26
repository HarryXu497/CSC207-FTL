import { Router, type Request } from 'express';
import type {
  AccuracyAnalyzer,
  AccuracyRepository,
  BranchRepository,
  CallRepository,
  MessageRepositoryBuilder,
} from 'src/repository';
import { z } from 'zod';
import {
  AnalyzeAccuracyInteractor,
  AnalyzeAccuracyPresenter,
  MAX_MESSAGE_CHARS,
  MAX_MESSAGES,
  MAX_TRANSCRIPT_CHARS,
  type AnalyzeAccuracyOutputBoundary,
} from './AnalyzeAccuracy';
import { AnalyzeStoredAccuracyInteractor } from './AnalyzeStoredAccuracy';
import {
  GetAccuracyInteractor,
  GetAccuracyPresenter,
  type GetAccuracyOutputBoundary,
} from './GetAccuracy';
import type { AccuracyTarget } from './target';

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
  topic: z.string().trim().max(300).optional(),
});

export class AccuracyController {
  constructor(
    private readonly analyzer: AccuracyAnalyzer | null,
    private readonly accuracyRepo: AccuracyRepository | null,
    private readonly callRepo: CallRepository,
    private readonly branchRepo: BranchRepository,
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
      presenter.presentBadRequest(
        'That request was not valid.',
        parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      );
      return;
    }

    await new AnalyzeAccuracyInteractor(this.analyzer).handle(parsed.data, presenter);
  }

  /** Analyzes the stored transcript of a call and saves the result under that call. */
  async analyzeCallAccuracy(req: Request, presenter: AnalyzeAccuracyOutputBoundary) {
    const callId = req.params.callId;

    if (!callId || typeof callId !== 'string') {
      presenter.presentBadRequest('callId is required');
      return;
    }

    await this.analyzeStored(callId, 'call', presenter);
  }

  /** Analyzes the stored transcript of a branch and saves the result under that branch. */
  async analyzeBranchAccuracy(req: Request, presenter: AnalyzeAccuracyOutputBoundary) {
    const branchId = req.params.branchId;

    if (!branchId || typeof branchId !== 'string') {
      presenter.presentBadRequest('branchId is required');
      return;
    }

    await this.analyzeStored(branchId, 'branch', presenter);
  }

  /** Reads the saved result for a call. */
  async getCallAccuracy(req: Request, presenter: GetAccuracyOutputBoundary) {
    const callId = req.params.callId;

    if (!callId || typeof callId !== 'string') {
      presenter.presentNotFound('callId is required');
      return;
    }

    await this.getSaved(callId, 'call', presenter);
  }

  /** Reads the saved result for a branch. */
  async getBranchAccuracy(req: Request, presenter: GetAccuracyOutputBoundary) {
    const branchId = req.params.branchId;

    if (!branchId || typeof branchId !== 'string') {
      presenter.presentNotFound('branchId is required');
      return;
    }

    await this.getSaved(branchId, 'branch', presenter);
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
      this.getCallAccuracy(req, new GetAccuracyPresenter(res)),
    );

    router.post('/calls/:callId/branches/:branchId/accuracy', async (req, res) =>
      this.analyzeBranchAccuracy(req, new AnalyzeAccuracyPresenter(res)),
    );

    router.get('/calls/:callId/branches/:branchId/accuracy', async (req, res) =>
      this.getBranchAccuracy(req, new GetAccuracyPresenter(res)),
    );

    return router;
  }

  private async analyzeStored(
    id: string,
    target: AccuracyTarget,
    presenter: AnalyzeAccuracyOutputBoundary,
  ) {
    if (!this.analyzer || !this.accuracyRepo) {
      presenter.presentServiceUnavailable();
      return;
    }

    const interactor = new AnalyzeStoredAccuracyInteractor(
      this.analyzer,
      this.accuracyRepo,
      this.callRepo,
      this.branchRepo,
      this.messageRepoFactory,
    );

    await interactor.handle({ id, target }, presenter);
  }

  private async getSaved(id: string, target: AccuracyTarget, presenter: GetAccuracyOutputBoundary) {
    if (!this.accuracyRepo) {
      presenter.presentServiceUnavailable();
      return;
    }

    await new GetAccuracyInteractor(this.accuracyRepo).handle({ id, target }, presenter);
  }
}
