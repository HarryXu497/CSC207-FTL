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
  type SentimentRepository,
} from 'src/repository';
import { AccuracyController, BranchController, SentimentController } from 'src/service';
import { createCallsRouter, createHealthRouter, createMessagesRouter } from './routers';

/** Optional services. A missing service makes the corresponding routes respond with 503 */
export interface ServerServices {
  analyseMessages?: AnalyseMessages | null;
  accuracyAnalyzer?: AccuracyAnalyzer | null;
  accuracyRepo?: AccuracyRepository | null;
  sentimentRepo?: SentimentRepository | null;
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
  const sentimentRepo = services.sentimentRepo ?? null;
  const branchController = new BranchController(callRepo, branchRepo, accuracyRepo, sentimentRepo);
  const sentimentController = new SentimentController(
    callRepo,
    branchRepo,
    messageRepoFactory,
    services.analyseMessages ?? null,
    sentimentRepo,
  );
  const accuracyController = new AccuracyController(
    services.accuracyAnalyzer ?? null,
    accuracyRepo,
    callRepo,
    branchRepo,
    messageRepoFactory,
  );

  router.use(createHealthRouter(backend));
  router.use(
    createCallsRouter(
      callRepo,
      messageRepoFactory,
      accuracyRepo ?? undefined,
      sentimentRepo ?? undefined,
    ),
  );
  router.use(createMessagesRouter(callRepo, messageRepoFactory));
  router.use(branchController.router());
  router.use(sentimentController.router());
  router.use(accuracyController.router());

  return router;
}
