import { Router, type Request } from 'express';
import type {
  BranchRepository,
  CallRepository,
  MessageRepositoryBuilder,
  SentimentAnalyzer,
  SentimentRepository,
} from 'src/repository';
import {
  GetSentimentInteractor,
  GetSentimentPresenter,
  type GetSentimentOutputBoundary,
} from './GetSentiment';
import {
  ListCallSentimentsInteractor,
  ListCallSentimentsPresenter,
  type ListCallSentimentsOutputBoundary,
} from './ListCallSentiments';
import type { SentimentTarget } from './target';

export class SentimentController {
  constructor(
    private readonly callsRepo: CallRepository,
    private readonly branchRepo: BranchRepository,
    private readonly messageRepoFactory: MessageRepositoryBuilder,
    private readonly analyseMessages: SentimentAnalyzer | null,
    private readonly sentimentRepo: SentimentRepository | null,
  ) {}

  /** Analyzes the stored transcript of a call and saves the result under that call. */
  async listCallSentiments(req: Request, presenter: ListCallSentimentsOutputBoundary) {
    const callId = req.params.callId;

    if (!callId || typeof callId !== 'string') {
      presenter.presentBadRequest('callId is required');
      return;
    }

    await this.analyzeStored(callId, 'call', presenter);
  }

  /** Analyzes the stored transcript of a branch and saves the result under that branch. */
  async listBranchSentiments(req: Request, presenter: ListCallSentimentsOutputBoundary) {
    const branchId = req.params.branchId;

    if (!branchId || typeof branchId !== 'string') {
      presenter.presentBadRequest('branchId is required');
      return;
    }

    await this.analyzeStored(branchId, 'branch', presenter);
  }

  /** Reads the saved result for a call. */
  async getCallSentiment(req: Request, presenter: GetSentimentOutputBoundary) {
    const callId = req.params.callId;

    if (!callId || typeof callId !== 'string') {
      presenter.presentNotFound('callId is required');
      return;
    }

    await this.getSaved(callId, 'call', presenter);
  }

  /** Reads the saved result for a branch. */
  async getBranchSentiment(req: Request, presenter: GetSentimentOutputBoundary) {
    const branchId = req.params.branchId;

    if (!branchId || typeof branchId !== 'string') {
      presenter.presentNotFound('branchId is required');
      return;
    }

    await this.getSaved(branchId, 'branch', presenter);
  }

  router(): Router {
    const router = Router();

    router.post('/calls/:callId/sentiment', async (req, res) =>
      this.listCallSentiments(req, new ListCallSentimentsPresenter(res)),
    );

    router.get('/calls/:callId/sentiment', async (req, res) =>
      this.getCallSentiment(req, new GetSentimentPresenter(res)),
    );

    router.post('/calls/:callId/branches/:branchId/sentiment', async (req, res) =>
      this.listBranchSentiments(req, new ListCallSentimentsPresenter(res)),
    );

    router.get('/calls/:callId/branches/:branchId/sentiment', async (req, res) =>
      this.getBranchSentiment(req, new GetSentimentPresenter(res)),
    );

    return router;
  }

  private async analyzeStored(
    id: string,
    target: SentimentTarget,
    presenter: ListCallSentimentsOutputBoundary,
  ) {
    if (!this.analyseMessages || !this.sentimentRepo) {
      presenter.presentServiceUnavailable();
      return;
    }

    const interactor = new ListCallSentimentsInteractor(
      this.callsRepo,
      this.branchRepo,
      this.messageRepoFactory,
      this.analyseMessages,
      this.sentimentRepo,
    );

    await interactor.handle({ id, target }, presenter);
  }

  private async getSaved(
    id: string,
    target: SentimentTarget,
    presenter: GetSentimentOutputBoundary,
  ) {
    if (!this.sentimentRepo) {
      presenter.presentServiceUnavailable();
      return;
    }

    await new GetSentimentInteractor(this.sentimentRepo).handle({ id, target }, presenter);
  }
}
