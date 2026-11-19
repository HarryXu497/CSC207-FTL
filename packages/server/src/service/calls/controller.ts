import { Router, type Request } from 'express';
import type { Call, Message } from 'src/entities';
import type { CallRepository, MessageRepositoryBuilder } from 'src/repository';
import z from 'zod';
import {
  CreateCallInteractor,
  CreateCallPresenter,
  type CreateCallOutputBoundary,
} from './CreateCall';

const messageSchema = z.object({
  role: z.enum(['agent', 'customer']),
  content: z.string(),
  createdAt: z.string(),
});

const createCallSchema = z.object({
  customerName: z.string().trim().min(1, 'Customer name is required.').max(120),
  topic: z.string().trim().min(1, 'Topic is required.').max(300),
  messages: z.array(messageSchema),
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
      customerName: parsed.data.customerName,
      topic: parsed.data.topic,
    };

    const messageData: Omit<Message, 'id'>[] = parsed.data.messages;
    const interactor = new CreateCallInteractor(this.callRepo, this.messageRepoFactory);

    await interactor.handle({ callData, messageData }, presenter);
  }

  router(): Router {
    const router = Router();

    router.post('/calls', async (req, res) => this.createCall(req, new CreateCallPresenter(res)));

    return router;
  }
}
