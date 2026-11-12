import type {
  CreateMessageResponse,
  GetMessagesResponse,
  Message,
  ServerResponse,
} from '@recall/shared';
import { Router, type Response } from 'express';
import type { MessageRepository } from 'src/repository';
import { MessagesService } from 'src/service';
import { z } from 'zod';
import { buildErrorFromSafeParseError } from '../utils';

const postMessageSchema = z.object({
  role: z.enum(['agent', 'customer']),
  content: z.string().trim().min(1, 'Content is required.'),
});

export type MessageRepoFactory = (
  parentCollection: 'calls' | 'branches',
  parentId: string,
) => MessageRepository;

export function createMessagesRouter(repoFactory: MessageRepoFactory): Router {
  const router = Router();

  router.get(
    '/calls/:callId/messages',
    async (req, res: Response<ServerResponse<GetMessagesResponse>>) => {
      const repo = repoFactory('calls', req.params.callId);
      const getMessages = new MessagesService.GetMessages(repo);
      const messages = await getMessages.handle();
      res.json({ messages });
    },
  );

  router.get(
    '/calls/:callId/branches/:branchId/messages',
    async (req, res: Response<ServerResponse<GetMessagesResponse>>) => {
      const repo = repoFactory('branches', req.params.branchId);
      const getMessages = new MessagesService.GetMessages(repo);
      const messages = await getMessages.handle();
      res.json({ messages });
    },
  );

  router.post(
    '/calls/:callId/messages',
    async (req, res: Response<ServerResponse<CreateMessageResponse>>) => {
      const parsed = postMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        res
          .status(400)
          .json({ error: buildErrorFromSafeParseError(parsed, 'That request was not valid.') });
        return;
      }
      const message = { ...parsed.data, createdAt: new Date().toISOString() };
      const repo = repoFactory('calls', req.params.callId);
      const postMessages = new MessagesService.PostMessages(repo);
      const id = await postMessages.handle(message);
      res.status(201).json({ message: { id, ...message } });
    },
  );

  router.post(
    '/calls/:callId/branches/:branchId/messages',
    async (req, res: Response<ServerResponse<CreateMessageResponse>>) => {
      const parsed = postMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        res
          .status(400)
          .json({ error: buildErrorFromSafeParseError(parsed, 'That request was not valid.') });
        return;
      }
      const message = { ...parsed.data, createdAt: new Date().toISOString() };
      const repo = repoFactory('branches', req.params.branchId);
      const postMessages = new MessagesService.PostMessages(repo);
      const id = await postMessages.handle(message);
      res.status(201).json({ message: { id, ...message } });
    },
  );

  // Use server-sent events (SSE)
  router.get('/calls/:callId/messages/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const repo = repoFactory('calls', req.params.callId);
    const streamMessages = new MessagesService.StreamMessages(repo);
    const unsubscribe = streamMessages.handle((messages: Message[]) => {
      res.write(`data: ${JSON.stringify(messages)}\n\n`);
    });

    req.on('close', () => unsubscribe());
  });

  // Use server-sent events (SSE)
  router.get('/calls/:callId/branches/:branchId/messages/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const repo = repoFactory('calls', req.params.callId);
    const streamMessages = new MessagesService.StreamMessages(repo);
    const unsubscribe = streamMessages.handle((messages: Message[]) => {
      res.write(`data: ${JSON.stringify(messages)}\n\n`);
    });

    req.on('close', () => unsubscribe());
  });

  return router;
}
