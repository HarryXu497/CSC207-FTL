import type { Branch } from '@recall/shared';
import type { BranchRepository } from 'src/repository/database/branches';

export class GetBranch {
  constructor(private readonly branchRepository: BranchRepository) {}

  async handle(branchId: string): Promise<Branch> {
    return await this.branchRepository.getBranch(branchId);
  }
}
