/**
 * Creates the router and handles route configuration
 */
import { Router } from 'express';
import type { AnalyseMessages, BranchRepository, CallRepository } from 'src/repository';
import { AccuracyController, SentimentController, type AccuracyDependencies } from 'src/service';
import { createCallsRouter, createHealthRouter, createMessagesRouter } from './routers';
import type { MessageRepositoryBuilder } from 'src/repository';
import { createBranchesRouter } from './routers/branch';

/** Optional services. A missing one makes its routes answer 503 instead of stopping the server. */
export interface ServerServices {
  analyseMessages?: AnalyseMessages | null;
  accuracy?: AccuracyDependencies | null;
}

export function createRouter(
  callRepo: CallRepository,
  branchRepo: BranchRepository,
  messageRepoFactory: MessageRepositoryBuilder,
  backend: 'memory' | 'firestore',
  services: ServerServices = {},
): Router {
  const router = Router();
  const sentimentController = new SentimentController(
    callRepo,
    messageRepoFactory,
    services.analyseMessages ?? null,
  );
  const accuracyController = new AccuracyController(services.accuracy ?? null);

  router.use(createHealthRouter(backend));
  router.use(createCallsRouter(callRepo));
  router.use(createBranchesRouter(branchRepo));
  router.use(createMessagesRouter(callRepo, messageRepoFactory));
  router.use(sentimentController.router());
  router.use(accuracyController.router());

  return router;
}
