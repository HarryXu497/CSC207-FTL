import { Router, type Request } from 'express';
import type { BranchRepository, CallRepository, MessageRepositoryBuilder } from 'src/repository';
import {
  ListMessagesInteractor,
  ListMessagesPresenter,
  type ListMessagesOutputBoundary,
} from './ListMessages';

export class MessagesController {
  constructor(
    private readonly callsRepo: CallRepository,
    private readonly branchRepo: BranchRepository,
    private readonly messageRepoFactory: MessageRepositoryBuilder,
  ) {}

  async listCallMessages(req: Request, presenter: ListMessagesOutputBoundary) {
    const callId = req.params.callId;

    if (!callId || typeof callId !== 'string') {
      presenter.presentBadRequest('callId is required');
      return;
    }

    const interactor = new ListMessagesInteractor(
      this.callsRepo,
      this.branchRepo,
      this.messageRepoFactory,
    );

    await interactor.handle({ callId }, presenter);
  }

  async listBranchMessages(req: Request, presenter: ListMessagesOutputBoundary) {
    const { callId, branchId } = req.params;

    if (
      typeof callId !== 'string' ||
      !callId.trim() ||
      typeof branchId !== 'string' ||
      !branchId.trim()
    ) {
      presenter.presentBadRequest('callId and branchId are required');
      return;
    }

    const interactor = new ListMessagesInteractor(
      this.callsRepo,
      this.branchRepo,
      this.messageRepoFactory,
    );

    await interactor.handle({ callId, branchId }, presenter);
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
