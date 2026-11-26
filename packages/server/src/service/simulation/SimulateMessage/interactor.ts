import { NotFoundError, SimulationConflictError } from 'src/errors';
import type { BranchRepository, CallRepository, SimulationRepository } from 'src/repository';
import type { SimulateMessageInputBoundary, SimulateMessageInputData } from './input';
import type { SimulateMessageOutputBoundary } from './output';

export class SimulateMessageInteractor implements SimulateMessageInputBoundary {
  constructor(
    private readonly callRepo: CallRepository,
    private readonly branchRepo: BranchRepository,
    private readonly simulationRepo: SimulationRepository,
  ) {}

  async handle(
    { callId, branchId, expectedLastMessageId }: SimulateMessageInputData,
    presenter: SimulateMessageOutputBoundary,
  ): Promise<void> {
    try {
      await this.callRepo.getCall(callId);
      const branch = await this.branchRepo.getBranch(branchId);

      if (branch.parentId !== callId) {
        presenter.presentNotFound(`Branch ${branchId} does not belong to call ${callId}.`);
        return;
      }

      const message = await this.simulationRepo.simulateCustomerReply(
        { callId, branchId },
        expectedLastMessageId,
      );

      presenter.present({ message });
    } catch (error) {
      if (error instanceof NotFoundError) {
        presenter.presentNotFound(error.message);
        return;
      }

      if (error instanceof SimulationConflictError) {
        presenter.presentConflict(error.message);
        return;
      }

      throw error;
    }
  }
}
