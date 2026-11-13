import type { BranchRepository } from 'src/repository';

export class PostBranches {
  constructor(private readonly branchRepo: BranchRepository) {}

  async handle(callId: string, branchIndex: number): Promise<string> {
    return await this.branchRepo.createBranchFromCall(callId, branchIndex);
  }
}
