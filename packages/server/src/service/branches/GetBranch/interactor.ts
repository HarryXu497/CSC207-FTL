import { NotFoundError } from 'src/errors';
import type { BranchRepository } from 'src/repository';
import type { GetBranchInputBoundary, GetBranchInputData } from './input';
import type { GetBranchOutputBoundary } from './output';

export class GetBranchInteractor implements GetBranchInputBoundary {
  constructor(private readonly branchRepo: BranchRepository) {}

  async handle(
    { branchId }: GetBranchInputData,
    presenter: GetBranchOutputBoundary,
  ): Promise<void> {
    try {
      const branch = await this.branchRepo.getBranch(branchId);
      presenter.present({ branch });
    } catch (e) {
      if (e instanceof NotFoundError) {
        presenter.presentNotFound(`Branch with id ${branchId} not found.`);
        return;
      }

      throw e;
    }
  }
}
