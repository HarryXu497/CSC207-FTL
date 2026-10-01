/**
 * The HTTP layer: URLs in, JSON out.
 *
 * Every handler does the same four things and nothing more:
 *   1. read values off the request
 *   2. validate them
 *   3. do the work
 *   4. send JSON
 *
 * It is a FACTORY FUNCTION rather than a module-level router so the repository
 * arrives as an argument - that is what lets the test build an app wired to a
 * throwaway in-memory repository.
 */
import { randomUUID } from 'node:crypto';
import { Router, type Response } from 'express';
import { z } from 'zod';
import type { Call, CreateCallResponse, HealthResponse, ListCallsResponse } from '@recall/shared';
import type { CallRepository } from './CallRepository';

/**
 * RUNTIME validation of the incoming body, with Zod.
 *
 * Why, when TypeScript already has `CreateCallRequest`? Because TypeScript is
 * ERASED at build time - it protects us from our own mistakes and does nothing at
 * runtime. Anyone can `curl` this endpoint with `{"score": "banana"}` and no type
 * annotation will stop them. Types for data we control; validation for data
 * crossing a trust boundary.
 */
const createCallSchema = z.object({
  customerName: z.string().trim().min(1, 'Customer name is required.').max(120),
  topic: z.string().trim().min(1, 'Topic is required.').max(300),
  score: z.number().int().min(0).max(100),
});

export function createRouter(repo: CallRepository, backend: 'memory' | 'firestore'): Router {
  const router = Router();

  /** Cheap liveness check. Hit this first whenever the UI looks broken. */
  router.get('/health', (_req, res: Response<HealthResponse>) => {
    res.json({ status: 'ok', backend });
  });

  /** Read from the database. */
  router.get('/calls', async (_req, res: Response<ListCallsResponse>) => {
    const calls = await repo.listCalls();
    res.json({ calls });
  });

  /** Write to the database. */
  router.post('/calls', async (req, res) => {
    /* `safeParse` returns a result instead of throwing, so we can send our own
       error shape rather than leaking Zod's. */
    const parsed = createCallSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          message: 'That request was not valid.',
          /* Tell the browser WHICH field failed, so the form can say so. */
          details: parsed.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
      });
      return;
    }

    /* The server owns the id and the timestamp - never let the client choose
       them, or two users can collide or backdate a record. */
    const call: Call = {
      id: `call-${randomUUID()}`,
      handledAt: new Date().toISOString(),
      ...parsed.data,
    };

    await repo.saveCall(call);

    /* 201 Created, not 200 - this request made a new resource. */
    res.status(201).json({ call } satisfies CreateCallResponse);
  });

  return router;
}
