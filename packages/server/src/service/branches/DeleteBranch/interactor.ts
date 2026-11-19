import { NotFoundError } from 'src/errors';
import type { BranchRepository } from 'src/repository';
import type { DeleteBranchInputBoundary, DeleteBranchInputData } from './input';
import type { DeleteBranchOutputBoundary } from './output';

export class DeleteBranchInteractor implements DeleteBranchInputBoundary {
  constructor(private readonly branchRepo: BranchRepository) {}

  async handle(
    { branchId }: DeleteBranchInputData,
    presenter: DeleteBranchOutputBoundary,
  ): Promise<void> {
    try {
      await this.branchRepo.getBranch(branchId);
    } catch (e) {
      if (e instanceof NotFoundError) {
        presenter.presentNotFound(`Branch with id ${branchId} not found.`);
        return;
      }

      throw e;
    }

    await this.branchRepo.deleteBranch(branchId);

    presenter.present();
  }
}
