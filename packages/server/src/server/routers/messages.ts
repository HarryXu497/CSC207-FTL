import type { Router } from 'express';
import type { BranchRepository, CallRepository } from 'src/repository';
import type { MessageRepositoryBuilder } from 'src/repository';
import { MessagesController } from 'src/service';

export function createMessagesRouter(
  callsRepo: CallRepository,
  branchRepo: BranchRepository,
  messageRepoFactory: MessageRepositoryBuilder,
): Router {
  const messagesController = new MessagesController(callsRepo, branchRepo, messageRepoFactory);
  return messagesController.router();
}
