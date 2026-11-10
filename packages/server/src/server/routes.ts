/**
 * Creates the router and handles route configuration
 */
import { Router } from 'express';
import type { CallRepository } from 'src/repository';
import type { AccuracyService } from 'src/service';
import { createAccuracyRouter, createCallsRouter, createHealthRouter } from './routers';

/** Optional features. A missing one makes its routes answer 503 rather than stopping the server. */
export interface ServerServices {
  accuracy?: InstanceType<typeof AccuracyService.AnalyzeAccuracy>;
}

export function createRouter(
  callRepo: CallRepository,
  backend: 'memory' | 'firestore',
  services: ServerServices = {},
): Router {
  const router = Router();

  router.use(createHealthRouter(backend));
  router.use(createCallsRouter(callRepo));
  router.use(createAccuracyRouter(services.accuracy));

  return router;
}
