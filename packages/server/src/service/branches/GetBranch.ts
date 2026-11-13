import type { Branch } from 'src/entities';
import type { BranchRepository } from 'src/repository';

export interface GetBranchesResponse {
  branches: Branch[];
}

export interface GetBranchResponse {
  branch: Branch;
}

export class GetBranch {
  constructor(private readonly branchRepository: BranchRepository) {}

  async handle(branchId: string): Promise<Branch> {
    return await this.branchRepository.getBranch(branchId);
  }
}
