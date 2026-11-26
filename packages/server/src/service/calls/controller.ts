import { Router, type Request } from 'express';
import type { CallRepository, MessageRepositoryBuilder } from 'src/repository';
import type { Call, Message } from 'src/entities';
import z from 'zod';
import {
  CreateCallInteractor,
  CreateCallPresenter,
  type CreateCallOutputBoundary,
} from './CreateCall';
import { GetCallInteractor, GetCallPresenter, type GetCallOutputBoundary } from './GetCall';
import { ListCallsInteractor, ListCallsPresenter, type ListCallsOutputBoundary } from './ListCalls';
import {
  DeleteCallInteractor,
  DeleteCallPresenter,
  type DeleteCallOutputBoundary,
} from './DeleteCall';

const messageSchema = z.object({
  role: z.enum(['agent', 'customer']),
  content: z.string(),
  createdAt: z.string(),
});

const createCallSchema = z.object({
  callData: z.object({
    customerName: z.string().trim().min(1, 'Customer name is required.').max(120),
    topic: z.string().trim().min(1, 'Topic is required.').max(300),
  }),
  messageData: z.array(messageSchema),
});

export class CallController {
  constructor(
    private readonly callRepo: CallRepository,
    private readonly messageRepoFactory: MessageRepositoryBuilder,
  ) {}

  async createCall(req: Request, presenter: CreateCallOutputBoundary) {
    const parsed = createCallSchema.safeParse(req.body);

    if (!parsed.success) {
      presenter.presentBadRequest('That request was not valid.');
      return;
    }

    const callData: Omit<Call, 'id'> = {
      createdAt: new Date().toISOString(),
      ...parsed.data.callData,
    };

    const messageData: Omit<Message, 'id'>[] = parsed.data.messageData;
    const interactor = new CreateCallInteractor(this.callRepo, this.messageRepoFactory);

    await interactor.handle({ callData, messageData }, presenter);
  }

  async getCall(req: Request, presenter: GetCallOutputBoundary) {
    const callId = req.params.callId;

    if (!callId || typeof callId !== 'string') {
      presenter.presentBadRequest('callId is required');
      return;
    }

    const interactor = new GetCallInteractor(this.callRepo);

    await interactor.handle({ callId: callId }, presenter);
  }

  async listCalls(presenter: ListCallsOutputBoundary) {
    const interactor = new ListCallsInteractor(this.callRepo);

    await interactor.handle(presenter);
  }

  async deleteCall(req: Request, presenter: DeleteCallOutputBoundary) {
    const callId = req.params.callId;

    if (!callId || typeof callId !== 'string') {
      presenter.presentBadRequest('callId is required');
      return;
    }

    const interactor = new DeleteCallInteractor(this.callRepo);

    await interactor.handle({ callId }, presenter);
  }

  router(): Router {
    const router = Router();

    router.post('/calls', async (req, res) => this.createCall(req, new CreateCallPresenter(res)));

    router.get('/calls/:callId', async (req, res) => this.getCall(req, new GetCallPresenter(res)));

    router.get('/calls', async (_req, res) => this.listCalls(new ListCallsPresenter(res)));

    router.delete('/calls/:callId', async (req, res) =>
      this.deleteCall(req, new DeleteCallPresenter(res)),
    );

    return router;
  }
}
