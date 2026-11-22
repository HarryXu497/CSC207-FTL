import { NotFoundError } from 'src/errors';
import type { AccuracyRepository, BranchRepository, SentimentRepository } from 'src/repository';
import type { DeleteBranchInputBoundary, DeleteBranchInputData } from './input';
import type { DeleteBranchOutputBoundary } from './output';

export class DeleteBranchInteractor implements DeleteBranchInputBoundary {
  constructor(
    private readonly branchRepo: BranchRepository,
    private readonly accuracyRepo: AccuracyRepository | null = null,
    private readonly sentimentRepo: SentimentRepository | null = null,
  ) {}

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
    // A branch's saved results have no meaning without the branch, so they go with it.
    await this.accuracyRepo?.deleteAccuracyForCall(branchId);
    await this.sentimentRepo?.deleteSentimentForCall(branchId);

    presenter.present();
  }
}
