/**
 * Creates the router and handles route configuration
 */
import { Router } from 'express';
import type { AnalyseMessages, BranchRepository, CallRepository } from 'src/repository';
import {
  AccuracyController,
  SentimentController,
  type AnalyzeAccuracyInputBoundary,
} from 'src/service';
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
  analyzeAccuracy: AnalyzeAccuracyInputBoundary | null = null,
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
  router.use(new AccuracyController(analyzeAccuracy).router());

  return router;
}
