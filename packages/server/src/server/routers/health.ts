import { Router, type Response } from 'express';

export interface HealthResponse {
  status: 'ok';
  /** Which storage implementation the server booted with. */
  backend: 'memory' | 'firestore';
}

export function createHealthRouter(backend: 'memory' | 'firestore'): Router {
  const router = Router();

  router.get('/health', (_req, res: Response<HealthResponse>) => {
    res.json({ status: 'ok', backend });
  });

  return router;
}
