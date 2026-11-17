import { Router, type Request } from 'express';
import type { AnalyseMessages, CallRepository, MessageRepositoryBuilder } from 'src/repository';
import {
  ListCallSentimentInteractor,
  ListCallSentimentsPresenter,
  type ListCallsSentimentOutputBoundary,
} from './ListCallSentiments';

export class SentimentController {
  constructor(
    private readonly callsRepo: CallRepository,
    private readonly messageRepoFactory: MessageRepositoryBuilder,
    private readonly analyseMessages: AnalyseMessages | null,
  ) {}

  async listCallSentiments(req: Request, presenter: ListCallsSentimentOutputBoundary) {
    if (!this.analyseMessages) {
      presenter.presentServiceUnavailable();
      return;
    }

    const callId = req.params.callId;

    if (!callId || typeof callId !== 'string') {
      presenter.presentBadRequest('callId is required');
      return;
    }

    const interactor = new ListCallSentimentInteractor(
      this.callsRepo,
      this.messageRepoFactory,
      this.analyseMessages,
    );

    await interactor.handle({ callId }, presenter);
  }

  router(): Router {
    const router = Router();

    router.get('/calls/:callId/sentiment', async (req, res) =>
      this.listCallSentiments(req, new ListCallSentimentsPresenter(res)),
    );

    return router;
  }
}
