/**
 * Creates the router and handles route configuration
 */
import { Router } from 'express';
import type {
  AnalyseMessages,
  BranchRepository,
  CallRepository,
  MessageRepositoryBuilder,
} from 'src/repository';
import { CallController } from 'src/service';
import { BranchController } from 'src/service';
import { SentimentController } from 'src/service';
import { createHealthRouter, createMessagesRouter } from './routers';

export function createRouter(
  callRepo: CallRepository,
  branchRepo: BranchRepository,
  messageRepoFactory: MessageRepositoryBuilder,
  backend: 'memory' | 'firestore',
  analyseMessages: AnalyseMessages | null,
): Router {
  const router = Router();
  const callController = new CallController(callRepo, messageRepoFactory);
  const branchController = new BranchController(callRepo, branchRepo);
  const sentimentController = new SentimentController(
    callRepo,
    messageRepoFactory,
    analyseMessages,
  );

  router.use(createHealthRouter(backend));
  router.use(callController.router());
  router.use(createMessagesRouter(callRepo, messageRepoFactory));
  router.use(branchController.router());
  router.use(sentimentController.router());

  return router;
}
