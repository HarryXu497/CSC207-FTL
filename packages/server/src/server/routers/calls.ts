import { Router, type Response } from 'express';
import type { WithError } from 'src/entities';
import { NotFoundError } from 'src/errors';
import type { CallRepository, MessageRepositoryBuilder } from 'src/repository';
import { CallsService } from 'src/service';
import { CallController } from 'src/service/calls/controller';
import type { GetCallResponse } from 'src/service/calls/GetCall';
import type { GetCallsResponse } from 'src/service/calls/GetCalls';

export function createCallsRouter(
  callRepo: CallRepository,
  messageRepoFactory: MessageRepositoryBuilder,
): Router {
  const controller = new CallController(callRepo, messageRepoFactory);
  const router = controller.router();
  const getCalls = new CallsService.GetCalls(callRepo);
  const getCall = new CallsService.GetCall(callRepo);

  // Read from the database
  router.get('/calls', async (_req, res: Response<WithError<GetCallsResponse>>) => {
    const calls = await getCalls.handle();
    res.json({ calls });
  });

  router.get('/calls/:id', async (req, res: Response<WithError<GetCallResponse>>) => {
    const id = req.params.id;

    try {
      const call = await getCall.handle(id);
      res.json({ call });
    } catch (e) {
      if (e instanceof NotFoundError) {
        res.status(404).json({ error: { message: e.message } });
      } else {
        throw e;
      }
    }
  });
  return router;
}
