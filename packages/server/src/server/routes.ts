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
import { SentimentController } from 'src/service';
import { BranchController } from 'src/service/branches/controller';
import { createCallsRouter, createHealthRouter, createMessagesRouter } from './routers';
import { createBranchesRouter } from './routers/branch';

export function createRouter(
  callRepo: CallRepository,
  branchRepo: BranchRepository,
  messageRepoFactory: MessageRepositoryBuilder,
  backend: 'memory' | 'firestore',
  analyseMessages: AnalyseMessages | null,
): Router {
  const router = Router();
  const branchController = new BranchController(callRepo, branchRepo);
  const sentimentController = new SentimentController(
    callRepo,
    messageRepoFactory,
    analyseMessages,
  );

  router.use(createHealthRouter(backend));
  router.use(createCallsRouter(callRepo));
  router.use(createMessagesRouter(callRepo, messageRepoFactory));
  router.use(createBranchesRouter(callRepo, branchRepo));
  router.use(branchController.router());
  router.use(sentimentController.router());

  return router;
}
