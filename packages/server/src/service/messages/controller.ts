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

  async listCallMessages(req: Request, presenter: ListMessagesOutputBoundary) {
    const callId = req.params.callId;

    if (!callId || typeof callId !== 'string') {
      presenter.presentBadRequest('callId is required');
      return;
    }

    const messageRepo = this.messageRepoFactory('calls', callId);
    const interactor = new ListMessagesInteractor(this.callsRepo, messageRepo);

    await interactor.handle({ callId }, presenter);
  }

  async listBranchMessages(req: Request, presenter: ListMessagesOutputBoundary) {
    const callId = req.params.callId;

    if (!callId || typeof callId !== 'string') {
      presenter.presentBadRequest('callId is required');
      return;
    }

    const messageRepo = this.messageRepoFactory('branches', callId);
    const interactor = new ListMessagesInteractor(this.callsRepo, messageRepo);

    await interactor.handle({ callId }, presenter);
  }

  router(): Router {
    const router = Router();

    router.get('/calls/:callId/messages', async (req, res) =>
      this.listCallMessages(req, new ListMessagesPresenter(res)),
    );

    router.get('/calls/:callId/branches/:branchId/messages', async (req, res) =>
      this.listBranchMessages(req, new ListMessagesPresenter(res)),
    );

    return router;
  }
}
