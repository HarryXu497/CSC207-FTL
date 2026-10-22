import type { HealthResponse } from '@recall/shared';
import { Router, type Response } from 'express';

export function createHealthRouter(backend: 'memory' | 'firestore'): Router {
  const router = Router();

  router.get('/health', (_req, res: Response<HealthResponse>) => {
    res.json({ status: 'ok', backend });
  });

  return router;
}
