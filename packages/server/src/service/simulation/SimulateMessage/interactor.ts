import type { Branch } from 'src/entities';
import { NotFoundError } from 'src/errors';
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
    let branch: Branch;

    try {
      await this.callRepo.getCall(callId);
      branch = await this.branchRepo.getBranch(branchId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        presenter.presentNotFound(error.message);
        return;
      }

      throw error;
    }

    if (branch.parentId !== callId) {
      presenter.presentNotFound(`Branch ${branchId} does not belong to call ${callId}.`);
      return;
    }

    const message = await this.simulationRepo.simulateCustomerReply(
      { callId, branchId },
      expectedLastMessageId,
    );

    presenter.present({ message });
  }
}
