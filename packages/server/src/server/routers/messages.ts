import type { Router, Request, Response } from 'express';
import type { BranchRepository, CallRepository, MessageRepository } from 'src/repository';
import { MessagesService } from 'src/service';
import type { MessageRepositoryBuilder } from 'src/repository';
import type { Message } from 'src/entities';
import { MessagesController } from 'src/service';

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
  branchRepo: BranchRepository,
  messageRepoFactory: MessageRepositoryBuilder,
): Router {
  const messagesController = new MessagesController(callsRepo, branchRepo, messageRepoFactory);
  const router = messagesController.router();

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
