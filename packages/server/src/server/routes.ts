/**
 * Creates the router and handles route configuration
 */
import { Router } from 'express';
import type { CallRepository } from 'src/repository';
import type { BranchRepository } from 'src/repository/database/branches';
import { createCallsRouter, createHealthRouter } from './routers';
import { createBranchesRouter } from './routers/branch';

export function createRouter(
  callRepo: CallRepository,
  branchRepo: BranchRepository,
  backend: 'memory' | 'firestore',
): Router {
  const router = Router();

  router.use(createHealthRouter(backend));
  router.use(createCallsRouter(callRepo));
  router.use(createBranchesRouter(branchRepo));

  return router;
}
