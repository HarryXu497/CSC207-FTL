import type { BranchRepository } from 'src/repository/database/branches';

export class DeleteBranch {
  constructor(private readonly branchRepo: BranchRepository) {}

  async handle(branchId: string): Promise<void> {
    await this.branchRepo.deleteBranch(branchId);
  }
}
