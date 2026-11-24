import { Router, type Request } from 'express';
import z from 'zod';
import type { BranchRepository, CallRepository, MessageRepositoryBuilder } from 'src/repository';
import {
  ListMessagesInteractor,
  ListMessagesPresenter,
  type ListMessagesOutputBoundary,
} from './ListMessages';
import {
  PostMessageInteractor,
  PostMessagePresenter,
  type PostMessageOutputBoundary,
} from './PostMessage';

const postMessageSchema = z.object({
  role: z.enum(['agent', 'customer']),
  content: z.string().trim().min(1),
});

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

  async postMessage(req: Request, presenter: PostMessageOutputBoundary): Promise<void> {
    const { callId, branchId } = req.params;
    if (
      typeof callId !== 'string' ||
      !callId.trim() ||
      (branchId !== undefined && (typeof branchId !== 'string' || !branchId.trim()))
    ) {
      presenter.presentBadRequest('A callId and, for branch messages, a branchId are required.');
      return;
    }

    const parsed = postMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      presenter.presentBadRequest('A valid role and non-empty content are required.');
      return;
    }

    const interactor = new PostMessageInteractor(
      this.callsRepo,
      this.branchRepo,
      this.messageRepoFactory,
    );
    await interactor.handle({ callId, branchId, messageData: parsed.data }, presenter);
  }

  router(): Router {
    const router = Router();

    router.get('/calls/:callId/messages', async (req, res) =>
      this.listCallMessages(req, new ListMessagesPresenter(res)),
    );

    router.get('/calls/:callId/branches/:branchId/messages', async (req, res) =>
      this.listBranchMessages(req, new ListMessagesPresenter(res)),
    );

    router.post('/calls/:callId/messages', async (req, res) =>
      this.postMessage(req, new PostMessagePresenter(res)),
    );

    router.post('/calls/:callId/branches/:branchId/messages', async (req, res) =>
      this.postMessage(req, new PostMessagePresenter(res)),
    );

    return router;
  }
}
