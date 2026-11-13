import type { Branch } from 'src/entities';
import type { BranchRepository } from 'src/repository';

export interface CreateBranchRequest {
  branchIndex: number;
}

export interface CreateBranchResponse {
  branch: Branch;
}

export class PostBranches {
  constructor(private readonly branchRepo: BranchRepository) {}

  async handle(callId: string, branchIndex: number): Promise<string> {
    return await this.branchRepo.createBranchFromCall(callId, branchIndex);
  }
}
