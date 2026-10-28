/**
 * Creates the router and handles route configuration
 */
import { Router } from 'express';
import type { CallRepository } from 'src/repository';
import { createHealthRouter } from './routers';
import { createCallsRouter } from './routers';

export function createRouter(callRepo: CallRepository, backend: 'memory' | 'firestore'): Router {
  const router = Router();

  router.use(createHealthRouter(backend));
  router.use(createCallsRouter(callRepo));

  return router;
}
