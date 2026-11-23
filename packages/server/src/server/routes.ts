/**
 * Creates the router and handles route configuration
 */
import { Router } from 'express';
import type {
  AnalyseMessages,
  BranchRepository,
  CallRepository,
  Ingestor,
  MessageRepositoryBuilder,
} from 'src/repository';
import { BranchController, CallController, SentimentController } from 'src/service';
import { createDocumentsRouter, createHealthRouter, createMessagesRouter } from './routers';

export function createRouter(
  callRepo: CallRepository,
  branchRepo: BranchRepository,
  messageRepoFactory: MessageRepositoryBuilder,
  backend: 'memory' | 'firestore',
  analyseMessages: AnalyseMessages | null,
  ingestor: Ingestor | null = null,
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
  router.use(createDocumentsRouter(ingestor));
  router.use(createMessagesRouter(callRepo, messageRepoFactory));
  router.use(branchController.router());
  router.use(sentimentController.router());

  return router;
}
