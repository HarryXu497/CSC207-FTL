import { Router, type Request } from 'express';
import z from 'zod';
import {
  SimulateMessagePresenter,
  type SimulateMessageInputBoundary,
  type SimulateMessageOutputBoundary,
} from './SimulateMessage';

const simulateMessageSchema = z.object({
  expectedLastMessageId: z.string().trim().min(1),
});

export class SimulationController {
  constructor(private readonly interactor: SimulateMessageInputBoundary | null) {}

  async simulateMessage(req: Request, presenter: SimulateMessageOutputBoundary): Promise<void> {
    if (!this.interactor) {
      presenter.presentServiceUnavailable();
      return;
    }

    const { callId, branchId } = req.params;
    if (
      typeof callId !== 'string' ||
      !callId.trim() ||
      typeof branchId !== 'string' ||
      !branchId.trim()
    ) {
      presenter.presentBadRequest('callId and branchId are required.');
      return;
    }

    const parsed = simulateMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      presenter.presentBadRequest('expectedLastMessageId must be a non-empty string.');
      return;
    }

    await this.interactor.handle(
      { callId, branchId, expectedLastMessageId: parsed.data.expectedLastMessageId },
      presenter,
    );
  }

  router(): Router {
    const router = Router();

    router.post('/calls/:callId/branches/:branchId/simulate', async (req, res) =>
      this.simulateMessage(req, new SimulateMessagePresenter(res)),
    );

    return router;
  }
}
