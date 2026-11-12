/**
 * Creates the router and handles route configuration
 */
import { Router } from 'express';
import type { BranchRepository, CallRepository } from 'src/repository';
import {
  createCallsRouter,
  createHealthRouter,
  createMessagesRouter,
  createSentimentRouter,
  type MessageRepoFactory,
  type SentimentDeps,
} from './routers';
import { createBranchesRouter } from './routers/branch';

export function createRouter(
  callRepo: CallRepository,
  branchRepo: BranchRepository,
  messageRepoFactory: MessageRepoFactory,
  backend: 'memory' | 'firestore',
  sentiment?: SentimentDeps,
): Router {
  const router = Router();

  router.use(createHealthRouter(backend));
  router.use(createCallsRouter(callRepo));
  router.use(createBranchesRouter(branchRepo));
  router.use(createMessagesRouter(messageRepoFactory));
  router.use(createSentimentRouter(callRepo, sentiment));

  return router;
}
