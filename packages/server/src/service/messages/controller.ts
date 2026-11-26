import { Router, type Request, type Response } from 'express';
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
import {
  StreamMessagesInteractor,
  StreamMessagesPresenter,
  type StreamMessagesOutputBoundary,
} from './StreamMessages';

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

  async streamMessages(
    req: Request,
    presenter: StreamMessagesOutputBoundary,
  ): Promise<(() => void) | null> {
    const { callId, branchId } = req.params;
    if (
      typeof callId !== 'string' ||
      !callId.trim() ||
      (branchId !== undefined && (typeof branchId !== 'string' || !branchId.trim()))
    ) {
      presenter.presentBadRequest('A callId and, for branch messages, a branchId are required.');
      return null;
    }

    const interactor = new StreamMessagesInteractor(
      this.callsRepo,
      this.branchRepo,
      this.messageRepoFactory,
    );
    return interactor.handle({ callId, branchId }, presenter);
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

    const stream = async (req: Request, res: Response): Promise<void> => {
      let disconnected = false;
      let unsubscribe: (() => void) | null = null;
      res.once('close', () => {
        disconnected = true;
        unsubscribe?.();
      });

      unsubscribe = await this.streamMessages(req, new StreamMessagesPresenter(res));
      if (disconnected) unsubscribe?.();
    };
    router.get('/calls/:callId/messages/stream', stream);
    router.get('/calls/:callId/branches/:branchId/messages/stream', stream);

    return router;
  }
}
