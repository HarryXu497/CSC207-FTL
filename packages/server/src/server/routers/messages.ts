import { Router, type Request, type Response } from 'express';
import type { CallRepository, MessageRepository } from 'src/repository';
import { MessagesService } from 'src/service';
import type { MessageRepositoryBuilder } from 'src/repository';
import { z } from 'zod';
import { buildErrorFromSafeParseError } from '../utils';
import type { Message, WithError } from 'src/entities';
import { ListMessagesPresenter } from 'src/service';
import { MessagesController } from 'src/service';
import type { CreateMessageResponse } from 'src/service/messages/PostMessages';

const postMessageSchema = z.object({
  role: z.enum(['agent', 'customer']),
  content: z.string().trim().min(1, 'Content is required.'),
});

/** Appends a new message, generating createdAt server-side. */
async function postMessage(
  repo: MessageRepository,
  req: Request,
  res: Response<WithError<CreateMessageResponse>>,
): Promise<void> {
  const parsed = postMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: buildErrorFromSafeParseError(parsed, 'That request was not valid.') });
    return;
  }
  const message = { ...parsed.data, createdAt: new Date().toISOString() };
  const postMessages = new MessagesService.PostMessages(repo);
  const id = await postMessages.handle(message);
  res.status(201).json({ message: { id, ...message } });
}

/** Opens an SSE stream that pushes the full message list whenever it is updated. */
function streamMessages(repo: MessageRepository, req: Request, res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const streamMessages = new MessagesService.StreamMessages(repo);
  const unsubscribe = streamMessages.handle((messages: Message[]) => {
    res.write(`data: ${JSON.stringify(messages)}\n\n`);
  });

  req.on('close', () => unsubscribe());
}

export function createMessagesRouter(
  callsRepo: CallRepository,
  messageRepoFactory: MessageRepositoryBuilder,
): Router {
  const router = Router();
  const messagesController = new MessagesController(callsRepo, messageRepoFactory);

  router.get('/calls/:callId/messages', (req, res) =>
    messagesController.listCallMessages(req, new ListMessagesPresenter(res)),
  );

  router.get('/calls/:callId/branches/:branchId/messages', (req, res) =>
    messagesController.listBranchMessages(req, new ListMessagesPresenter(res)),
  );

  router.post('/calls/:callId/messages', (req, res) => {
    const repo = messageRepoFactory('calls', req.params.callId);
    return postMessage(repo, req, res);
  });

  router.post('/calls/:callId/branches/:branchId/messages', (req, res) => {
    const repo = messageRepoFactory('branches', req.params.branchId);
    return postMessage(repo, req, res);
  });

  router.get('/calls/:callId/messages/stream', (req, res) => {
    const repo = messageRepoFactory('calls', req.params.callId);
    return streamMessages(repo, req, res);
  });

  router.get('/calls/:callId/branches/:branchId/messages/stream', (req, res) => {
    const repo = messageRepoFactory('branches', req.params.branchId);
    return streamMessages(repo, req, res);
  });

  return router;
}
