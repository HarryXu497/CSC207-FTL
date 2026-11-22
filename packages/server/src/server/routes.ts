/**
 * Creates the router and handles route configuration
 */
import { Router } from 'express';
import {
  type AccuracyAnalyzer,
  type AccuracyRepository,
  type AnalyseMessages,
  type BranchRepository,
  type CallRepository,
  type MessageRepositoryBuilder,
} from 'src/repository';
import { AccuracyController, BranchController, SentimentController } from 'src/service';
import { createCallsRouter, createHealthRouter, createMessagesRouter } from './routers';

/** Optional services. A missing service makes the corresponding routes respond with 503 */
export interface ServerServices {
  analyseMessages?: AnalyseMessages | null;
  accuracyAnalyzer?: AccuracyAnalyzer | null;
  accuracyRepo?: AccuracyRepository | null;
}

export function createRouter(
  callRepo: CallRepository,
  branchRepo: BranchRepository,
  messageRepoFactory: MessageRepositoryBuilder,
  backend: 'memory' | 'firestore',
  services: ServerServices = {},
): Router {
  const router = Router();
  const accuracyRepo = services.accuracyRepo ?? null;
  const branchController = new BranchController(callRepo, branchRepo, accuracyRepo);
  const sentimentController = new SentimentController(
    callRepo,
    messageRepoFactory,
    services.analyseMessages ?? null,
  );
  const accuracyController = new AccuracyController(
    services.accuracyAnalyzer ?? null,
    accuracyRepo,
    callRepo,
    branchRepo,
    messageRepoFactory,
  );

  router.use(createHealthRouter(backend));
  router.use(createCallsRouter(callRepo, messageRepoFactory, accuracyRepo ?? undefined));
  router.use(createMessagesRouter(callRepo, messageRepoFactory));
  router.use(branchController.router());
  router.use(sentimentController.router());
  router.use(accuracyController.router());

  return router;
}
