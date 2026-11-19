/**
 * Creates the router and handles route configuration
 */
import { Router } from 'express';
import type { AnalyseMessages, BranchRepository, CallRepository, Ingestor } from 'src/repository';
import { SentimentController } from 'src/service';
import {
  createCallsRouter,
  createDocumentsRouter,
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
  ingestor: Ingestor | null = null,
): Router {
  const router = Router();
  const sentimentController = new SentimentController(
    callRepo,
    messageRepoFactory,
    analyseMessages,
  );

  router.use(createHealthRouter(backend));
  router.use(createCallsRouter(callRepo));
  router.use(createDocumentsRouter(ingestor));
  router.use(createBranchesRouter(branchRepo));
  router.use(createMessagesRouter(messageRepoFactory));
  router.use(sentimentController.router());

  return router;
}
