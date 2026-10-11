/**
 * Creates the router and handles route configuration
 */
import { randomUUID } from 'node:crypto';
import { Router, type Response } from 'express';
import { z } from 'zod';
import type { Call, CreateCallResponse, HealthResponse, ListCallsResponse } from '@recall/shared';
import type { CallRepository } from './CallRepository';

// Runtime request body validation using zod
const createCallSchema = z.object({
  customerName: z.string().trim().min(1, 'Customer name is required.').max(120),
  topic: z.string().trim().min(1, 'Topic is required.').max(300),
  score: z.number().int().min(0).max(100),
});

export function createRouter(repo: CallRepository, backend: 'memory' | 'firestore'): Router {
  const router = Router();

  // Health check
  router.get('/health', (_req, res: Response<HealthResponse>) => {
    res.json({ status: 'ok', backend });
  });

  // Read from the database
  router.get('/calls', async (_req, res: Response<ListCallsResponse>) => {
    const calls = await repo.listCalls();
    res.json({ calls });
  });

  // Write to the database
  router.post('/calls', async (req, res) => {
    const parsed = createCallSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          message: 'That request was not valid.',
          details: parsed.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
      });
      return;
    }

    const call: Call = {
      id: `call-${randomUUID()}`,
      handledAt: new Date().toISOString(),
      ...parsed.data,
    };

    await repo.saveCall(call);

    // 201 Created since the request made a new resource
    res.status(201).json({ call } satisfies CreateCallResponse);
  });

  return router;
}
