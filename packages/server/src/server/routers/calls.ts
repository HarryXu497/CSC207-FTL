import { Router, type Response } from 'express';
import type { WithError } from 'src/entities';
import type { CallRepository, MessageRepositoryBuilder } from 'src/repository';
import { CallsService } from 'src/service';
import { CallController } from 'src/service/calls/controller';
import type { GetCallsResponse } from 'src/service/calls/GetCalls';

export function createCallsRouter(
  callRepo: CallRepository,
  messageRepoFactory: MessageRepositoryBuilder,
): Router {
  const controller = new CallController(callRepo, messageRepoFactory);
  const router = controller.router();
  const getCalls = new CallsService.GetCalls(callRepo);

  // Read from the database
  router.get('/calls', async (_req, res: Response<WithError<GetCallsResponse>>) => {
    const calls = await getCalls.handle();
    res.json({ calls });
  });

  return router;
}
