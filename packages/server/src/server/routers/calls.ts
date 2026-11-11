import type { Call, CreateCallResponse, ListCallsResponse } from '@recall/shared';
import { Router, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { CallRepository } from 'src/repository';
import { CallsService } from 'src/service';
import { z } from 'zod';
import { buildErrorFromSafeParseError } from '../utils';

// Runtime request body validation using zod
const createCallSchema = z.object({
  customerName: z.string().trim().min(1, 'Customer name is required.').max(120),
  topic: z.string().trim().min(1, 'Topic is required.').max(300),
});

export function createCallsRouter(callRepo: CallRepository): Router {
  const router = Router();
  const getCalls = new CallsService.GetCalls(callRepo);
  const postCalls = new CallsService.PostCalls(callRepo);

  // Read from the database
  router.get('/calls', async (_req, res: Response<ListCallsResponse>) => {
    const calls = await getCalls.handle();
    res.json({ calls });
  });

  // Write to the database
  router.post('/calls', async (req, res) => {
    const parsed = createCallSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: buildErrorFromSafeParseError(parsed, 'That request was not valid.'),
      });
      return;
    }

    const call: Call = {
      id: `call-${randomUUID()}`,
      createdAt: new Date().toISOString(),
      ...parsed.data,
    };

    await postCalls.handle(call);

    // 201 Created since the request made a new resource
    res.status(201).json({ call } satisfies CreateCallResponse);
  });

  return router;
}
