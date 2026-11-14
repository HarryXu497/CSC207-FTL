/**
 * Creates the router and handles route configuration
 */
import { Router } from 'express';
import type { AnalyseMessages, BranchRepository, CallRepository } from 'src/repository';
import { SentimentController } from 'src/service';
import {
  createCallsRouter,
  createHealthRouter,
  createMessagesRouter,
  type MessageRepoFactory,
} from './routers';
import { createBranchesRouter } from './routers/branch';

export function createRouter(
  callRepo: CallRepository,
  branchRepo: BranchRepository,
  messageRepoFactory: MessageRepoFactory,
  backend: 'memory' | 'firestore',
  analyseMessages: AnalyseMessages | null,
): Router {
  const router = Router();
  const sentimentController = new SentimentController(
    callRepo,
    messageRepoFactory,
    analyseMessages,
  );

  router.use(createHealthRouter(backend));
  router.use(createCallsRouter(callRepo));
  router.use(createBranchesRouter(branchRepo));
  router.use(createMessagesRouter(messageRepoFactory));
  router.use(sentimentController.router());

  return router;
}
