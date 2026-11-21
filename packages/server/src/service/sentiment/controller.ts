import { Router, type Request } from 'express';
import type {
  AnalyseMessages,
  CallRepository,
  MessageRepositoryBuilder,
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

export class SentimentController {
  constructor(
    private readonly callsRepo: CallRepository,
    private readonly messageRepoFactory: MessageRepositoryBuilder,
    private readonly analyseMessages: AnalyseMessages | null,
    private readonly sentimentRepo: SentimentRepository,
  ) {}

  /** Analyzes the stored transcript of a call and saves the result under that call. */
  async listCallSentiments(req: Request, presenter: ListCallSentimentsOutputBoundary) {
    if (!this.analyseMessages) {
      presenter.presentServiceUnavailable();
      return;
    }

    const callId = req.params.callId;

    if (!callId || typeof callId !== 'string') {
      presenter.presentBadRequest('callId is required');
      return;
    }

    const interactor = new ListCallSentimentsInteractor(
      this.callsRepo,
      this.messageRepoFactory,
      this.analyseMessages,
      this.sentimentRepo,
    );

    await interactor.handle({ callId }, presenter);
  }

  /** Reads the saved result for a call. */
  async getSentiment(req: Request, presenter: GetSentimentOutputBoundary) {
    const callId = req.params.callId;

    if (!callId || typeof callId !== 'string') {
      presenter.presentNotFound('callId is required');
      return;
    }

    await new GetSentimentInteractor(this.sentimentRepo).handle({ callId }, presenter);
  }

  router(): Router {
    const router = Router();

    router.post('/calls/:callId/sentiment', async (req, res) =>
      this.listCallSentiments(req, new ListCallSentimentsPresenter(res)),
    );

    router.get('/calls/:callId/sentiment', async (req, res) =>
      this.getSentiment(req, new GetSentimentPresenter(res)),
    );

    return router;
  }
}
