import { Router, type Request } from 'express';
import type { CallRepository, MessageRepositoryBuilder } from 'src/repository';
import {
  ListMessagesInteractor,
  ListMessagesPresenter,
  type ListMessagesOutputBoundary,
} from './ListMessages';

export class MessagesController {
  constructor(
    private readonly callsRepo: CallRepository,
    private readonly messageRepoFactory: MessageRepositoryBuilder,
  ) {}

  async listMessages(req: Request, presenter: ListMessagesOutputBoundary) {
    const callId = req.params.callId;

    if (!callId || typeof callId !== 'string') {
      presenter.presentBadRequest('callId is required');
      return;
    }

    const interactor = new ListMessagesInteractor(this.callsRepo, this.messageRepoFactory);

    await interactor.handle({ callId }, presenter);
  }

  router(): Router {
    const router = Router();

    router.get('/calls/:callId/messages', async (req, res) =>
      this.listMessages(req, new ListMessagesPresenter(res)),
    );

    return router;
  }
}
