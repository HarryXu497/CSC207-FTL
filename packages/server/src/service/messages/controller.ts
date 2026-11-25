import { Router, type Request } from 'express';
import type { CallRepository, MessageRepositoryBuilder } from 'src/repository';
import {
  ListMessagesInteractor,
  ListMessagesPresenter,
  type ListMessagesOutputBoundary,
} from './ListMessages';

import {
  StreamMessagesInteractor,
  StreamMessagesPresenter,
  type StreamMessagesOutputBoundary,
} from './StreamMessages';

export class MessagesController {
  constructor(
    private readonly callsRepo: CallRepository,
    private readonly messageRepoFactory: MessageRepositoryBuilder,
  ) { }

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

  streamCallMessages(req: Request, presenter: StreamMessagesOutputBoundary): void {
    const callId = req.params.callId;

    if (!callId || typeof callId !== 'string') {
      presenter.presentBadRequest('callId is required');
      return;
    }

    const messageRepo = this.messageRepoFactory('calls', callId);
    const interactor = new StreamMessagesInteractor(messageRepo);

    const unsubscribe = interactor.handle(presenter);
    req.on('close', () => unsubscribe());
  }

  streamBranchMessages(req: Request, presenter: StreamMessagesOutputBoundary): void {
    const callId = req.params.callId;
    const branchId = req.params.branchId;

    if (!callId || typeof callId !== 'string') {
      presenter.presentBadRequest('callId is required');
      return;
    }

    if (!branchId || typeof branchId !== 'string') {
      presenter.presentBadRequest('branchId is required');
      return;
    }

    const messageRepo = this.messageRepoFactory('branches', branchId);
    const interactor = new StreamMessagesInteractor(messageRepo);

    const unsubscribe = interactor.handle(presenter);
    req.on('close', () => unsubscribe());
  }

  router(): Router {
    const router = Router();

    router.get('/calls/:callId/messages', async (req, res) =>
      this.listCallMessages(req, new ListMessagesPresenter(res)),
    );

    router.get('/calls/:callId/branches/:branchId/messages', async (req, res) =>
      this.listBranchMessages(req, new ListMessagesPresenter(res)),
    );

    router.get('/calls/:callId/messages/stream', (req, res) =>
      this.streamCallMessages(req, new StreamMessagesPresenter(res)),
    );

    router.get('/calls/:callId/branches/:branchId/messages/stream', (req, res) =>
      this.streamBranchMessages(req, new StreamMessagesPresenter(res)),
    );

    return router;
  }
}
