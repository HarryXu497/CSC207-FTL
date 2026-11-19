import { NotFoundError } from 'src/errors';
import type { BranchRepository, CallRepository } from 'src/repository';
import type { CreateBranchInputBoundary, CreateBranchInputData } from './input';
import type { CreateBranchOutputBoundary } from './output';

export class CreateBranchInteractor implements CreateBranchInputBoundary {
  constructor(
    private readonly callRepo: CallRepository,
    private readonly branchRepo: BranchRepository,
  ) {}

  async handle(
    { callId, branchIndex }: CreateBranchInputData,
    presenter: CreateBranchOutputBoundary,
  ): Promise<void> {
    try {
      await this.callRepo.getCall(callId);
    } catch (e) {
      if (e instanceof NotFoundError) {
        presenter.presentNotFound(`Call with id ${callId} not found.`);
        return;
      }

      throw e;
    }

    const branchId = await this.branchRepo.createBranchFromCall(callId, branchIndex);
    const branch = await this.branchRepo.getBranch(branchId);

    presenter.present({ branch });
  }
}
