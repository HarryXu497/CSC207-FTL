import { NotFoundError } from 'src/errors';
import type { BranchRepository, CallRepository } from 'src/repository';
import type { ListCallBranchesInputBoundary, ListCallBranchesInputData } from './input';
import type { ListCallBranchesOutputBoundary } from './output';

export class ListCallBranchesInteractor implements ListCallBranchesInputBoundary {
  constructor(
    private readonly callRepo: CallRepository,
    private readonly branchRepo: BranchRepository,
  ) {}

  async handle(
    { callId }: ListCallBranchesInputData,
    presenter: ListCallBranchesOutputBoundary,
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

    const branches = await this.branchRepo.getAllBranchesOfCall(callId);
    presenter.present({ branches });
  }
}
