/**
 * Creates the router and handles route configuration
 */
import { Router } from 'express';
import {
  InMemoryAccuracyRepository,
  InMemorySentimentRepository,
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

/** Optional services. A missing one makes its routes answer 503 instead of stopping the server. */
export interface ServerServices {
  analyseMessages?: AnalyseMessages | null;
  accuracyAnalyzer?: AccuracyAnalyzer | null;
  /** Where accuracy results are saved. Defaults to an in-memory store. */
  accuracyRepo?: AccuracyRepository;
  /** Where sentiment results are saved. Defaults to an in-memory store. */
  sentimentRepo?: SentimentRepository;
}

export function createRouter(
  callRepo: CallRepository,
  branchRepo: BranchRepository,
  messageRepoFactory: MessageRepositoryBuilder,
  backend: 'memory' | 'firestore',
  services: ServerServices = {},
): Router {
  const router = Router();
  const accuracyRepo = services.accuracyRepo ?? new InMemoryAccuracyRepository();
  const sentimentRepo = services.sentimentRepo ?? new InMemorySentimentRepository();
  const branchController = new BranchController(callRepo, branchRepo);
  const sentimentController = new SentimentController(
    callRepo,
    messageRepoFactory,
    services.analyseMessages ?? null,
  );
  const accuracyController = new AccuracyController(
    services.accuracyAnalyzer ?? null,
    accuracyRepo,
    callRepo,
    messageRepoFactory,
  );

  router.use(createHealthRouter(backend));
  router.use(createCallsRouter(callRepo, messageRepoFactory, accuracyRepo, sentimentRepo));
  router.use(createMessagesRouter(callRepo, messageRepoFactory));
  router.use(branchController.router());
  router.use(sentimentController.router());
  router.use(accuracyController.router());

  return router;
}
