import type { BranchRepository } from 'src/repository';

export class DeleteBranch {
  constructor(private readonly branchRepo: BranchRepository) {}

  async handle(branchId: string): Promise<void> {
    await this.branchRepo.deleteBranch(branchId);
  }
}
